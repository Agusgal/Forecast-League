# Development reference

**Predict the future. Compete with friends. Discover what the world believes.**

A mobile-first forecasting prototype built with Next.js, TypeScript, Tailwind CSS, shadcn-style Radix UI components, Lucide and Recharts. It supports a working local demo and a Supabase-backed mode. There are no financial stakes, betting, tradable contracts or virtual currencies.

## Run locally

Requirements: **Node.js 20.9 or newer** and npm. No external credentials are needed for the local demo.

```sh
npm install
npm run dev
```

On this prepared Mac, you can also run `./dev.sh`. It uses system Node when available, or Codex’s bundled Node runtime when Node is not on your terminal PATH. Dependencies must already be installed.

Open **http://localhost:3000**. The development server binds to `0.0.0.0` so it is reachable from other devices on your network.

To try it on your phone:

1. Connect the computer and phone to the same Wi-Fi network.
2. Find the computer's local IPv4 address in its Wi-Fi/network settings, or run `ipconfig getifaddr en0` on macOS. If Next.js prints `0.0.0.0`, replace it with that local IPv4 address.
3. On the phone, open **http://YOUR_COMPUTER_LAN_IP:3000**, for example `http://192.168.1.42:3000`. The phone's `localhost` refers to the phone itself.
4. If it does not load, allow Node.js through the computer firewall and check that the router does not isolate Wi-Fi clients. Use the port printed in the terminal if port 3000 was already occupied.

A `pnpm-lock.yaml` is included for the installed dependency graph. If you use pnpm, run `pnpm install --frozen-lockfile` and `pnpm dev` instead. Use one package manager consistently.

Optional environment setup:

```sh
cp .env.example .env.local
```

Leave both Supabase variables empty to use the demo. Restart the development server after changing environment variables.

## Try the complete flow

1. Open a question from the home feed, read the criteria and choose a probability from 1% to 99%.
2. Submit it, optionally with reasoning. A server-created session owns the forecast; the server validates the deadline and writes it to persistent storage.
3. See confirmation and the newly unlocked consensus, then reload to confirm persistence. Submit a revision before the deadline; every previous version remains in the audit history.
4. Edit your profile, create a private league, or join the fictional example league with code **FUTURE**. Share a league's invitation link/code with another browser or phone session.
5. With a registered administrator account, open **Question studio** from the desktop sidebar or your profile, or visit **/admin**. Create a draft, publish it, forecast, close it, then resolve Yes/No to see Brier scoring and profile statistics. Published criteria cannot be edited. Void an ambiguous question instead.

The first vertical slice is **Landing → signup or demo → forecast feed → question detail → probability selection → server validation → persistent submission → confirmation and consensus**. The prototype also includes four time horizons, forecast revisions, local account signup/sign-in and connected email authentication, user profiles, accuracy/calibration, global and country rankings, private weekly/monthly leagues, world consensus, and manual administration.

## Local demo behavior

With neither Supabase environment variable set, the app initializes **`.data/forecast-league.json`** on the first bootstrap request. Questions, fictional profiles/forecasts, your session, revisions, league memberships and new resolution scores survive page refreshes and server restarts. Each round deadline is immutable. Local demo access adds a fresh Argentine round when the previous one expires, retaining all history.

The demo is explicitly labeled throughout the product. Its eight fictional forecasters, scenarios and completed outcomes are illustrative data, not real community statistics or reports about real events. Reference links describe the kinds of authoritative sources a real question could use. Your new profile starts with no invented forecasts, accuracy or achievements.

The public landing page is at `/`, the feed at `/forecasts`, and account pages at `/signup` and `/login`. Exploring the feed creates a guest profile with an opaque, HttpOnly, SameSite session cookie; only its hash is stored. Local signup upgrades that guest profile, preserving forecasts and leagues. It stores the normalized email and a salted scrypt password hash (never the plaintext password), rotates the session, and supports sign-out and returning sign-in across browsers on the same running server. Local emails are not verified or sent messages. Account credentials never appear in public read models. A per-account, in-process throttle limits authentication to ten attempts per minute.

Starting a fresh guest session creates a new profile and keeps the old audit history. Registered profiles offer **Sign out**, then can sign in again. Local accounts remain a demo feature; use Supabase for hosted, verified email authentication.

New local guests and registered accounts are not administrators. Existing registered administrators retain their role; a legacy guest administrator flag grants no effective privileges. A trusted local operator can bootstrap an administrator by stopping the server, backing up the data file and setting `isAdmin` only on the profile ID belonging to the intended registered entry in `accounts`. No public endpoint grants this role. **Keep demo mode on a trusted development network; it is not a public production backend.** The file adapter serializes operations in one Node process and writes with atomic file replacement. It is unsuitable for multiple server processes, serverless instances or simultaneous deployments sharing a file. Use Supabase for hosted persistence and real authentication.

To regenerate expired fixtures, stop the server and move `.data/forecast-league.json` aside as a backup, then restart and refresh. This starts a separate demo dataset; the old file retains your previous data. `FORECAST_DATA_PATH` can select a different absolute data-file path. The data directory and environment files are Git-ignored.

## Connect Supabase

Follow **[supabase/README.md](../supabase/README.md)** to apply all migrations in order, seed demonstration questions, configure email authentication, and designate an administrator.

Set both values in `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-or-publishable-key
```

The application uses the public key plus the current user's verified authentication token. **Never supply a secret or service-role key.** Known privileged key formats are rejected. Partial or invalid configuration produces a setup error; it does not silently fall back to local demo mode.

The connected seed creates questions marked as demonstration data, without invented users or forecasts. Connected consensus is computed only from actual submissions. Signed-out visitors can read published questions; signing in is required to forecast or join leagues. After email confirmation, return to the app and sign in. Local demo data is not imported into Supabase automatically.

Supabase Auth uses server-handled HttpOnly cookies and verified `getUser()` checks. PostgreSQL RLS and protected RPCs enforce ownership, role checks, valid submission windows, immutable revisions, resolution and scoring. HTTPS is required for deployed production cookies.

## Architecture

```text
src/app/                 Next.js App Router shell and API endpoints
src/components/          Responsive application screens and visualizations
src/components/ui/       Reusable accessible UI primitives
src/domain/types.ts      Client-independent models and API read models
src/domain/schemas.ts    Shared Zod validation contracts
src/domain/scoring.ts    Pure scoring, ranking, calibration and consensus logic
src/domain/workspace.ts  Plan capabilities, quota clock and strict participation contracts
src/server/local-workspace.ts  Local proposals, communities, surveys and private projections
src/domain/seed.ts       Clearly identified local demonstration fixtures
src/server/              Session handling, request validation and data adapters
supabase/migrations/     Relational schema, constraints, RLS and transactional RPCs
supabase/seed.sql        Connected demonstration questions
tests/                   Domain, persistence, API and session regression tests
```

The domain layer has no React or Next.js dependency and can be reused by a future Expo/React Native client. UI components call JSON endpoints rather than writing browser-local forecasts. The server selects the local file or Supabase adapter. The PostgreSQL implementation repeats security-critical scoring/validation rules inside transactions so a direct database API request cannot bypass them.

## API contract

All mutations accept `Content-Type: application/json`, use the current session and reject unexpected fields. Browser requests must be same-origin. Responses are private and not cached. Errors return `{ "error": "Human-readable explanation" }` with an appropriate HTTP status. Ownership, timestamps, revision numbers, roles and scores cannot be supplied by the caller.

**Probabilities are fractions:** `0.73` means 73%, and valid submitted values are `0.01` through `0.99`. API timestamps are ISO 8601 UTC strings. Shared response interfaces are in `src/domain/types.ts`.

| Method and route            | Request / response                                                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/bootstrap`        | `Bootstrap`: mode, current user, questions, own forecasts, gated consensus, leagues, rankings, personal stats                          |
| `POST /api/forecasts`       | `{ questionId, probability, reasoning? }` → `{ forecast }`; submit or revise                                                           |
| `GET /api/workspace`        | `WorkspaceState`: private plan, quota, own proposals, memberships, permitted aggregates and admin-only review queue |
| `POST /api/workspace`       | `WorkspaceAction` → updated `WorkspaceState`; strict discriminated contract in `src/domain/workspace.ts` |
| `POST /api/profile`         | `{ username, country }` → `{ user }`                                                                                                   |
| `GET /api/auth`             | Current account and mode, without creating a guest session                                                                             |
| `GET /auth/callback`        | Exchanges a Supabase confirmation code and redirects to the feed                                                                       |
| `POST /api/auth`            | `{ action: "login", email, password }`, `{ action: "signup", email, password, username, personalData }`, or `{ action: "logout" }`                   |
| `POST /api/leagues`         | `{ name, description?, period: "weekly" \| "monthly" }` → `{ league }`                                                                 |
| `POST /api/leagues/join`    | `{ code }` → `{ league }`; repeated joins do not duplicate membership                                                                  |
| `GET /api/admin/questions`  | Administrator-only `{ participation: [{ questionId, participants, revisions }] }`                                                      |
| `POST /api/admin/questions` | `{ action: "create", question }`, `{ action: "update", questionId, question }`, or `{ action, questionId, outcome? }` → `{ question }` |

Lifecycle actions are `publish`, `close`, `resolve`, `void`, and `cancel`; only `resolve` accepts an `outcome` of `0` or `1`. Draft creation/editing accepts the full editable record defined by `questionDraftSchema`; `isDemo`, status, ID and outcome are server-owned. Published wording, source, criteria and dates are immutable.

Bootstrap never includes another person's individual forecasts or reasoning. Before the current user submits on a question, its `consensus` is `null`, including participant counts and distribution/history. The separate administrator audit intentionally exposes counts, not individual predictions, for moderation.

## Participation and plan authorization

The five screens `/proposals`, `/communities`, `/plans`, `/enterprise` and `/moderation` use one private workspace read model. The public plan catalogue needs no account. Every mutation needs a registered account; administrative review and plan assignment additionally require the protected administrator role. Plans are stored separately from public profiles and default to Free.

`POST /api/workspace` accepts `propose`, `review`, `set_plan`, `create_community`, `join_community`, `set_curator`, `create_survey`, `answer_survey` and `withdraw_survey`. Exact fields and limits live in the Zod discriminated union. Local actions run inside the same serialized file transaction as their updated projection; Supabase executes them in `workspace_action(jsonb)` with database validation and row locks. Caller-supplied role, priority, status, ownership and timestamps are rejected. Daily quota exhaustion returns HTTP 429.

Free allows one proposal per Argentine calendar day; Pro, Community and Enterprise allow ten. A plan-row lock serializes PostgreSQL quota use. All submissions count, including rejected proposals, and plan changes do not reset usage. Submission plan/priority are immutable snapshots. Review is manual, priority first then oldest first, with no SLA. Approval locks the proposal and creates/publishes one immutable question atomically; expired submissions cannot be approved. Communities group public approved questions and do not change existing league access or scoring.

Community/Enterprise owners see aggregates for registered members on community-linked approved questions. Only Enterprise sees platform-wide aggregates. Precision requires five distinct registered resolved forecasters, separately at the global/community and category levels; open forecasts count only as activity. Neither projection includes raw forecasts, reasoning, private registration details or identified survey answers. Counts can remain visible below the precision threshold; this is a minimum cohort rule, not a differential-privacy guarantee.

Enterprise owners may appoint existing members as curators. Curators use their own plan quota, remain subject to moderation and forecast through the ordinary question UI. No trading or financial privileges exist. Enterprise owners may create single-choice surveys with a stated purpose, 2–6 distinct choices and a future close. Members must explicitly consent; only the owner's active Enterprise plan reveals aggregated results, suppressed below five active responses. Withdrawal clears the choice and consent timestamp even after closing or losing membership/plan access; a tombstone prevents re-answering. Downgrades preserve data while removing premium actions and aggregates. New survey answers require the owner's Enterprise plan to remain active.

The local adapter implements the same permissions. New PostgreSQL tables have RLS enabled and no direct anon/authenticated grants; only explicit RPC projections expose permitted data. Existing protected administrators can assign plans in `/moderation`. This prototype has no billing, plan purchase, guaranteed approval deadline or automatic publication.

## Scoring and fair comparisons

For a binary outcome, **Brier = (p − outcome)²**. Lower is better. Only resolved questions with valid outcomes contribute to finalized accuracy. Unresolved, void and cancelled questions do not improve a score. The **last valid revision strictly before the deadline** is used, and submissions at the deadline are rejected using the server/database clock.

Displayed points are **round(1,000 × (1 − mean Brier))**. They are an accuracy-derived, provisional display score, not money or a validated skill rating. Prediction volume alone does not add points. Rankings show resolved sample counts; global open-participation rankings are exploratory because people may answer different questions.

Private league rankings compare the intersection of resolved questions forecast by **every current league member**, resolved in the current UTC week or month. A league with no common resolved questions shows unranked members. Joining a league can change that shared sample. These are simple friends comparisons, not finalized tournament standings.

The database includes a foundation for official competitions with frozen published question sets and scoring rules. Event enrollment, participant snapshots, standings, missing-forecast penalties in an active event, and scheduling are **deferred**. No official competition is advertised as running.

## Checks

```sh
npm run typecheck
npm test
npm run build
```

The test command uses Node’s test runner with the TypeScript import hook:

```sh
node --import tsx --test tests/*.test.ts
```

Tests cover Brier scoring and last-valid-revision selection, aggregate weighting and calibration, durable reloads, concurrent writes, session ownership, deadline rejection, draft/lifecycle rules, private invitations, admin auditing, request validation, same-origin phone requests, and Supabase refresh-cookie/error behavior. The Supabase adapter tests mock transport; they do not establish that a hosted project is connected. Database migration verification and its limits are documented in the Supabase setup guide.

For a local production-build check, run `npm run build` then `npm start`. Use `npm run dev` for the documented HTTP phone-preview workflow. This prototype has not been operated as a public production service. Native apps, billing, OAuth, password recovery, verified skill ratings, regional comparison analytics, and automated question ingestion/resolution are outside this first version.

Verification commands include the unit/integration suite, strict TypeScript, a production build with `next build --webpack`, and the optional PostgreSQL harness. Workspace regression tests cover quota races and midnight boundaries, privileged operations, publication, privacy thresholds and consent withdrawal. Browser checks verified phone layout, forecast submission/revision/reload, consensus unlock, league creation, and profile editing. Admin persistence, lifecycle and resolution were covered by integration and PostgreSQL tests.

## Español y ejemplos argentinos

La interfaz usa español de Argentina (`es-AR`), fechas en horario argentino y coma decimal. Los valores internos de categorías, estados y plazos conservan sus claves para mantener la compatibilidad con los datos. Forecast League conserva su nombre de marca.

La demo local incluye nueve escenarios argentinos simulados: temperatura en Córdoba y Mendoza, lluvia en CABA, ráfagas en Rosario, dólar oficial mayorista, un amistoso ficticio de la Selección, IPC mensual, generación renovable y exportaciones. Sus umbrales, partidos y datos no son noticias ni cotizaciones actuales. Las fuentes enlazadas son referencias temáticas.

Una actualización local única traduce los ejemplos originales y agrega las preguntas argentinas sin reemplazar cuentas, sesiones, pronósticos, versiones, puntajes ni plazos existentes. Los plazos nuevos se fijan al agregar las preguntas y no cambian al recargar. Se conserva el contenido personalizado. `supabase/seed.sql` incluye ejemplos en español y las nueve simulaciones argentinas para nuevas cargas conectadas; no modifica preguntas ya publicadas.

Detailed signup fields, private storage and the additional migration are documented in the [main README](../README.md#registro-completo-y-preguntas-vigentes).
