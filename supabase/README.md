# Supabase setup

The app works in an explicitly labeled local demo without credentials. A connected project uses Supabase Auth, PostgreSQL and RLS with the signed-in user's access token. There is no service-role key in the application.

## Initialize a development project

1. Create a Supabase project, then run [`migrations/202610120001_forecast_league.sql`](./migrations/202610120001_forecast_league.sql) in its SQL editor. Apply this initial migration once to a fresh project. Then apply [`migrations/202610130001_registration_details.sql`](./migrations/202610130001_registration_details.sql). Then apply [`migrations/202610140001_plans_and_communities.sql`](./migrations/202610140001_plans_and_communities.sql) for plans, proposals, communities and surveys. Existing projects apply only migrations not already applied, in timestamp order. It stores mandatory registration details separately with owner-only RLS and preserves existing accounts. Alternatively, use the Supabase CLI to link the project and apply migrations.
2. Run [`seed.sql`](./seed.sql). It creates fifteen questions in Spanish, including nine simulated Argentine scenarios, marked `is_demo = true`, with deadlines relative to the current UTC day. It creates **no fabricated accounts, predictions, scores or community counts**. Re-running the seed does not alter published questions.
3. Copy the project URL and public anon/publishable key into the environment variables described in the repository README. Never use the secret or service-role key as a public key.
4. In Authentication → URL Configuration, add the local application URL and any LAN URL used on your phone. Configure the email authentication provider and redirect URLs for your development environment.
5. Register a user through the app. The database signup trigger creates its profile; no client-controlled auth metadata can create an administrator.

The seed questions illustrate product behavior. An administrator should review source availability and timing before creating production questions. The expected resolution time is an estimate; criteria may require waiting for a source release or review period. The local demo fixtures and connected database seed are separate datasets.

## Make an administrator

After signing in once, run this **only in the trusted Supabase SQL editor**. Replace the placeholder with the intended account's exact email, then check the returned row:

```sql
update public.profiles
set is_admin = true
where id = (select id from auth.users where email = 'you@example.com')
returning id, username, is_admin;
```

The browser can update only its own `username`, `country`, and `avatar_color`. The `is_admin` column is not writable through the authenticated API, even if an attacker crafts requests directly. Administrative RPCs check this protected database flag themselves; hiding an admin screen is not the authorization boundary.

## Data and API contracts

All timestamps are `timestamptz`; probabilities are fractions from `0.01` to `0.99`. Tables use `snake_case`. Read-model RPCs return the camelCase objects defined in `src/domain/types.ts`.

| Operation           | Contract                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace projection | `get_workspace()` → private `WorkspaceState`; safe empty projection when signed out |
| Workspace mutation | `workspace_action(p_input jsonb)` → updated `WorkspaceState`; registered accounts, action-specific plan/role checks |
| Submit or revise    | `submit_forecast(p_question_id uuid, p_probability numeric, p_reasoning text default '')` → `forecasts` row                           |
| Consensus           | `get_consensus(p_question_id uuid)` → `Consensus` JSON or `null` before the caller forecasts                                          |
| Global accuracy     | `get_leaderboard()` → `LeaderboardEntry[]` JSON                                                                                       |
| Personal statistics | `get_profile_stats()` → `ProfileStats` JSON for the signed-in user                                                                    |
| Admin participation | `get_question_participation()` → `{ questionId, participants, revisions }[]` JSON; administrator only; no individual reasoning        |
| Private leagues     | `get_leagues()` → `League[]` JSON for the caller's memberships                                                                        |
| Create league       | `create_league(p_name text, p_description text default '', p_period text default 'weekly')` → `leagues` row; creator becomes a member |
| Join invitation     | `join_league(p_code text)` → `leagues` row; repeat joins are idempotent                                                               |
| Lifecycle           | `transition_question(p_question_id uuid, p_status text)` → `questions` row; administrator only                                        |
| Resolve             | `resolve_question(p_question_id uuid, p_outcome integer, p_notes text default '')` → `questions` row; administrator only              |

Admins create and edit `DRAFT` questions through the normal questions API and RLS. Question states are `DRAFT → PUBLISHED → CLOSED → RESOLVED`, with `CANCELLED` or `VOID` exits. Resolution requires an explicit close first; admins may close early if the authoritative outcome is already known. Neither outcome nor resolution can be rewritten after finalization. Published wording, dates, category, criteria and source are frozen; void an ambiguous question and publish a replacement instead.

Every forecast submission locks its question, checks its live status/window using the database clock, updates the current forecast and appends a revision in the same transaction. Request data cannot set timestamps, ownership, revision counts or scores. Concurrent submissions and resolution serialize on that row lock. At resolution, the last revision strictly before the deadline is selected for each participant and the database generates `(probability - outcome)^2`. A unique key prevents double scoring.

Consensus includes only actual stored forecasts: mean probability, participant count, five distribution bins and daily UTC closing consensus. Each historical point reconstructs the last revision per forecaster known by that day's end, avoiding revision-volume weighting. Other people's individual forecasts and reasoning are never exposed by table SELECT. Users can read their own immutable history.

Global points are `round(1000 × (1 − mean Brier))`, so submitting more forecasts does not directly multiply points. Only finalized questions count. Global ranks are descriptive open-participation accuracy, not an official fixed-set tournament or a validated skill rating. Every result includes its resolved sample count. Private league rankings use the intersection of resolved questions forecast by **all current members**, during the current UTC week/month. A league can therefore have zero common resolved questions; unranked members return `rank: 0`. A new member can change the shared sample. This intentionally simple MVP comparison is not a finalized season standing.

The `competitions` and `competition_questions` tables provide a schema foundation for official events, with published question sets and scoring rules frozen in the database. Their policy uses mean Brier with missing forecasts scored as `1`. Official event enrollment, snapshots, standings and automated scheduling are **not implemented** in this MVP; the app does not advertise active official competitions.

## Authorization and verification

The optional [`tests/verify.mjs`](./tests/verify.mjs) harness runs the real migration and seed in a fresh in-memory PostgreSQL runtime. From the repository root, install its pinned test-only dependency in a separate temporary directory and run:

```sh
FORECAST_PGLITE_DIR="$(mktemp -d)"
npm install --prefix "$FORECAST_PGLITE_DIR" --ignore-scripts --no-audit --no-fund @electric-sql/pglite@0.5.9
FORECAST_PGLITE_DIR="$FORECAST_PGLITE_DIR" node supabase/tests/verify.mjs
```

This does not modify application dependencies or the lockfile, and requires no database credentials. The printed `PASS` lines include positive RPC checks and malicious direct-write/privilege-escalation attempts. Test source and seed paths resolve relative to the script, so it also works when invoked from another working directory. The temporary dependency directory may be removed after verification.

RLS is enabled on every application table. Public clients may read published questions; drafts are admin-only. Private league invitations and membership lists are visible only to members. Profiles expose only public display fields and the protected role flag. Anonymous callers cannot execute forecasting, scoring or league RPCs. Security-definer RPCs use an empty `search_path`, schema-qualified objects and explicit execute grants. Trigger functions cannot be invoked as public RPCs.

The migration and idempotent seed were executed successfully against a temporary PGlite PostgreSQL runtime with Supabase-style `anon`/`authenticated` roles and an `auth.uid()` test shim. Checks passed for RLS/grants, rejected privilege escalation and direct immutable-data writes, revisions, gated consensus, lifecycle/scoring, private league isolation, deadline/opening gates, and frozen competition sets. This does not test Supabase Auth, PostgREST, hosted configuration or real email delivery. No live Supabase project or credentials were supplied during implementation. Before production, verify the migrated database with at least two ordinary users and an administrator:

1. Read a published question while signed out; verify drafts remain hidden.
2. Submit as user A, revise, reload, and confirm both immutable revisions plus one current forecast. Before forecasting, user B receives no consensus. After their own forecast, B receives an aggregate of A and B.
3. As A, try direct INSERT/UPDATE/DELETE against `forecasts`, `forecast_revisions`, `scores`, `question_resolutions` and `league_members`; each must fail. Try updating `profiles.is_admin`; it must fail. Try reading B's raw forecasts; the result must be empty.
4. Create a short-window draft as the administrator, publish, and submit before the deadline. Verify a direct RPC after the deadline is rejected even when the client clock is changed. Close it, resolve it and check Brier uses the final pre-deadline revision. Resolving before an explicit close or repeating resolution must fail without duplicating scores.
5. Try changing published criteria, dates or source; each must fail. Confirm a non-admin cannot publish, close, resolve or void.
6. Create a private league, join by invitation as B, and verify an unrelated user cannot read its invite code or member list. Check that ranking compares only common resolved questions in the relevant UTC period.
7. If building official competitions later, verify their question sets and scoring policy cannot be changed after publication, and implement enrollment snapshots and missing-forecast penalties before exposing standings.

Back up the database and add project-appropriate email delivery, abuse/rate controls and monitoring before a public launch. Scheduled closing is optional: expired `PUBLISHED` questions already reject submissions based on the server clock.

## Email confirmation redirect

Allow `http://localhost:3000/auth/callback` in Supabase Auth redirect URLs (and your LAN or deployed origin with the same path when used). Signup supplies this callback URL. The app exchanges a PKCE code, or verifies an `email` token hash if configured in your email template, then returns to `/forecasts`. Invalid or expired links return to `/login` with an explanation. Verify email delivery and confirmation against your own project before publishing.

## Detailed registration

New signups require `personalData` with ISO alpha-2 `birthCountry` and `residenceCountry`, integer `age` from 1 to 120 and `sex` (`female`, `male`, `intersex`, `other`, `undisclosed`). Optional fields and constraints are defined in `src/domain/registration.ts`. Income requires both an amount and currency. The API checks `registration_ready()` before calling Auth, so missing migrations fail before account creation.

Signup passes `personal_data` through Auth user metadata. The protected signup trigger writes it to `registration_details` in the same transaction. Auth metadata is visible to its account owner and trusted Auth administrators; never serialize it into public profiles. The application exposes none of these fields in its public read models. RLS allows each authenticated user to select only their own details; anonymous access and client writes are not granted. Existing profiles have no backfilled or invented personal details.

## Plans, proposals, communities and surveys

The third migration adds `user_plans`, `question_proposals`, `communities`, `community_members`, `community_surveys` and `survey_responses`. All six tables have RLS enabled with direct privileges revoked from public, anon and authenticated. Security-definer RPCs use explicit projections, an empty search path and checked identities. Internal validation and analytics helpers cannot be called through the public API. Existing profiles and newly created accounts receive Free; only a protected administrator may assign another plan via the workspace action.

Quota checks lock the actor's plan row and count all submissions in the current Argentine calendar day. Free allows one, other plans ten; rejections and plan changes do not erase usage. Review locks a pending proposal, records the decision and publishes exactly once. Priority is a submission snapshot, not a promise of review within a fixed time. Community questions become ordinary public questions after approval; membership lists and invite codes remain private to members.

Community owners on Community/Enterprise receive community aggregates; Enterprise receives global activity/precision aggregates. Brier statistics require five registered people with resolved forecasts, including an independent threshold for each category. Survey choice counts are owner-only and suppressed until five active responses. No read model returns another person's personal registration details, raw forecast, reasoning or identified survey choice. The original public profiles and rankings retain their existing documented fields.

Enterprise community owners may appoint curators and create surveys. Curators use their own proposal quota and normal moderation. Members explicitly consent to one survey response. Withdrawal clears the option and consent timestamp but retains a minimal uniqueness record to prevent repeated responses. Withdrawal remains allowed after closing or a plan downgrade. A downgrade disables premium mutations/results and stops new answers to that owner's surveys without deleting existing communities or historical proposals.

The harness imports `tests/workspace.mjs` to test direct RPC requests as well as denied direct table access, forged fields, quota accounting, manual review, role changes, community isolation, small-sample suppression, consent and withdrawal. These are real PostgreSQL checks in PGlite, not a hosted Supabase integration test. Apply and verify the migration in the target project before enabling this feature there. The local file demo needs no SQL migration.
