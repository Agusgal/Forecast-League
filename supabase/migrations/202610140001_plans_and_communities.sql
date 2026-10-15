-- Plans, moderated proposals and private communities. Apply after registration_details.
-- All writes enter through workspace_action; no client can edit a plan or a response row.
create table public.user_plans (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','pro','community','enterprise')),
  updated_at timestamptz not null default clock_timestamp(),
  updated_by uuid references public.profiles(id) on delete set null
);
insert into public.user_plans(user_id) select id from public.profiles;
create function public.initialize_user_plan() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_plans(user_id) values(new.id);
  return new;
end;
$$;
create trigger initialize_user_plan after insert on public.profiles
  for each row execute function public.initialize_user_plan();

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  name text not null check (char_length(name) between 3 and 60),
  description text not null check (char_length(description) between 10 and 500),
  code text not null unique default upper(encode(extensions.gen_random_bytes(6),'hex')),
  created_at timestamptz not null default clock_timestamp()
);
create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','curator','member')),
  joined_at timestamptz not null default clock_timestamp(),
  primary key (community_id,user_id)
);
create index community_members_user_idx on public.community_members(user_id,community_id);

create table public.question_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  question jsonb not null check (jsonb_typeof(question) = 'object'),
  community_id uuid references public.communities(id),
  plan text not null check (plan in ('free','pro','community','enterprise')),
  priority text not null check (priority in ('normal','priority')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default clock_timestamp(),
  quota_day date not null,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  review_note text not null default '',
  published_question_id uuid unique references public.questions(id),
  check ((status = 'pending') = (reviewed_at is null)),
  check ((status = 'approved') = (published_question_id is not null)),
  check (status = 'pending' or (reviewed_by is not null and char_length(review_note) between 5 and 1000))
);
create index question_proposals_quota_idx on public.question_proposals(user_id,quota_day);
create index question_proposals_queue_idx on public.question_proposals(status,priority,submitted_at);
create index question_proposals_community_idx on public.question_proposals(community_id,published_question_id);

create table public.community_surveys (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  owner_id uuid not null references public.profiles(id),
  title text not null check (char_length(title) between 10 and 180),
  purpose text not null check (char_length(purpose) between 20 and 1000),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  closes_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp()
);
create table public.survey_responses (
  survey_id uuid not null references public.community_surveys(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option_index integer check (option_index between 0 and 5),
  consent_at timestamptz,
  consent_version text,
  withdrawn_at timestamptz,
  primary key (survey_id,user_id),
  check ((withdrawn_at is null and option_index is not null and consent_at is not null and consent_version = 'survey-purpose-v1')
      or (withdrawn_at is not null and option_index is null and consent_at is null and consent_version is null))
);

alter table public.user_plans enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.question_proposals enable row level security;
alter table public.community_surveys enable row level security;
alter table public.survey_responses enable row level security;
revoke all on public.user_plans, public.communities, public.community_members,
  public.question_proposals, public.community_surveys, public.survey_responses from public,anon,authenticated;
-- No generic administrator policy: the RPC exposes only authorized projections.

create function public.workspace_shape(p_object jsonb,p_required text[],p_optional text[] default '{}') returns void
language plpgsql immutable set search_path = '' as $$
begin
  if jsonb_typeof(p_object) is distinct from 'object' or not (p_object ?& p_required) then
    raise exception 'Missing workspace fields' using errcode = '22023';
  end if;
  if exists(select 1 from jsonb_object_keys(p_object) k where not (k = any(p_required || p_optional))) then
    raise exception 'Unexpected workspace field' using errcode = '22023';
  end if;
end;
$$;
create function public.workspace_text(p_object jsonb,p_key text,p_min integer,p_max integer) returns text
language plpgsql immutable set search_path = '' as $$
declare v_text text := btrim(p_object ->> p_key);
begin
  if jsonb_typeof(p_object -> p_key) is distinct from 'string'
     or char_length(v_text) not between p_min and p_max then
    raise exception 'Invalid workspace text: %',p_key using errcode = '22023';
  end if;
  return v_text;
end;
$$;
create function public.workspace_id(p_object jsonb,p_key text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return public.workspace_text(p_object,p_key,1,120)::uuid;
exception when invalid_text_representation then
  raise exception 'Invalid workspace identifier' using errcode = '22023';
end;
$$;
create function public.workspace_time(p_object jsonb,p_key text) returns timestamptz
language plpgsql stable set search_path = '' as $$
declare v_text text := public.workspace_text(p_object,p_key,20,40); v_time timestamptz;
begin
  if v_text !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$' then
    raise exception 'Timestamp needs ISO format and timezone' using errcode = '22023';
  end if;
  v_time := v_text::timestamptz;
  if not isfinite(v_time) then raise exception 'Invalid timestamp' using errcode = '22023'; end if;
  return v_time;
exception when datetime_field_overflow or invalid_datetime_format then
  raise exception 'Invalid timestamp' using errcode = '22023';
end;
$$;
create function public.workspace_question(p_question jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare v_result jsonb; v_open timestamptz; v_close timestamptz; v_resolve timestamptz;
begin
  perform public.workspace_shape(p_question,array['title','description','category','horizon','opensAt','closesAt','resolvesAt','resolutionCriteria','sourceName','sourceUrl'],array['visual']);
  v_open := public.workspace_time(p_question,'opensAt');
  v_close := public.workspace_time(p_question,'closesAt');
  v_resolve := public.workspace_time(p_question,'resolvesAt');
  v_result := jsonb_build_object(
    'title',public.workspace_text(p_question,'title',10,180),
    'description',public.workspace_text(p_question,'description',20,3000),
    'category',public.workspace_text(p_question,'category',1,30),
    'horizon',public.workspace_text(p_question,'horizon',1,20),
    'opensAt',p_question->>'opensAt','closesAt',p_question->>'closesAt','resolvesAt',p_question->>'resolvesAt',
    'resolutionCriteria',public.workspace_text(p_question,'resolutionCriteria',20,3000),
    'sourceName',public.workspace_text(p_question,'sourceName',2,120),
    'sourceUrl',public.workspace_text(p_question,'sourceUrl',8,2048),
    'visual',case when p_question ? 'visual' then public.workspace_text(p_question,'visual',1,20) else 'world' end);
  if v_result->>'category' not in ('Science & tech','Climate','World','Sports','Economy')
    or v_result->>'horizon' not in ('daily','weekly','monthly','long-term')
    or v_result->>'visual' not in ('space','climate','ai','world','sports','economy')
    or v_result->>'sourceUrl' !~ '^https?://[^/[:space:]]+[^[:space:]]*$'
    or not (v_open < v_close and v_close <= v_resolve) then
    raise exception 'Invalid question fields or dates' using errcode = '22023';
  end if;
  return v_result;
end;
$$;

-- Internal aggregate only. Revoked from clients; get_workspace supplies the authorized scope.
create function public.workspace_analytics(p_community uuid default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  with relevant as (
    select f.* from public.forecasts f
    where p_community is null or (
      exists(select 1 from public.question_proposals p where p.community_id=p_community and p.status='approved' and p.published_question_id=f.question_id)
      and exists(select 1 from public.community_members m where m.community_id=p_community and m.user_id=f.user_id)
    )
  ), resolved as (
    select s.user_id,s.brier,q.category from public.scores s
    join relevant f on f.id=s.forecast_id
    join public.questions q on q.id=s.question_id and q.status='RESOLVED'
  ), categories as (
    select category,count(*) as n,avg(brier) as mean from resolved
    group by category having count(distinct user_id)>=5
  )
  select jsonb_build_object(
    'participants',(select count(distinct user_id) from relevant),
    'forecasts',(select count(*) from relevant),
    'resolvedForecasts',(select count(*) from resolved),
    'meanBrier',case when (select count(distinct user_id) from resolved)>=5 then (select avg(brier) from resolved) else null end,
    'suppressed',(select count(distinct user_id) from resolved)<5,
    'byCategory',coalesce((select jsonb_agg(jsonb_build_object('category',category,'count',n,'meanBrier',mean) order by category) from categories),'[]'::jsonb));
$$;
create function public.workspace_proposal(p public.question_proposals) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',p.id,'userId',p.user_id,'username',(select username from public.profiles where id=p.user_id),
    'question',p.question,'communityId',p.community_id,'plan',p.plan,'priority',p.priority,'status',p.status,
    'submittedAt',p.submitted_at,'reviewedAt',p.reviewed_at,'reviewedBy',p.reviewed_by,
    'reviewNote',p.review_note,'publishedQuestionId',p.published_question_id);
$$;

create function public.get_workspace() returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_plan text := 'free'; v_registered boolean; v_limit integer; v_used integer := 0;
  v_time timestamptz := clock_timestamp(); v_day date; v_admin boolean; v_communities jsonb := '[]'; v_surveys jsonb := '[]';
begin
  v_day := (v_time at time zone 'America/Argentina/Buenos_Aires')::date;
  v_registered := v_user is not null and exists(select 1 from public.profiles where id=v_user);
  if v_registered then
    select plan into v_plan from public.user_plans where user_id=v_user;
    v_plan := coalesce(v_plan,'free');
    select count(*) into v_used from public.question_proposals where user_id=v_user and quota_day=v_day;
  end if;
  v_admin := v_registered and public.is_admin();
  v_limit := case when v_plan='free' then 1 else 10 end;
  if v_registered then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',c.id,'name',c.name,'description',c.description,'code',c.code,'ownerId',c.owner_id,
      'members',(select jsonb_agg(jsonb_build_object('userId',m.user_id,'username',p.username,'role',m.role) order by m.joined_at,m.user_id)
        from public.community_members m join public.profiles p on p.id=m.user_id where m.community_id=c.id),
      'questionIds',coalesce((select jsonb_agg(p.published_question_id order by p.submitted_at,p.id) from public.question_proposals p where p.community_id=c.id and p.status='approved'),'[]'::jsonb),
      'analytics',case when c.owner_id=v_user and v_plan in ('community','enterprise') then public.workspace_analytics(c.id) else null end
    ) order by c.created_at,c.id),'[]'::jsonb) into v_communities
    from public.communities c where exists(select 1 from public.community_members m where m.community_id=c.id and m.user_id=v_user);

    select coalesce(jsonb_agg(jsonb_build_object(
      'id',s.id,'communityId',s.community_id,'ownerId',s.owner_id,'title',s.title,'purpose',s.purpose,
      'options',s.options,'closesAt',s.closes_at,'createdAt',s.created_at,
      'answered',exists(select 1 from public.survey_responses r where r.survey_id=s.id and r.user_id=v_user),
      'acceptingResponses',s.closes_at>v_time
        and exists(select 1 from public.user_plans u where u.user_id=s.owner_id and u.plan='enterprise')
        and not exists(select 1 from public.survey_responses r where r.survey_id=s.id and r.user_id=v_user),
      'ownOptionIndex',(select r.option_index from public.survey_responses r where r.survey_id=s.id and r.user_id=v_user),
      'results',case when s.owner_id=v_user and v_plan='enterprise' then
        (select jsonb_build_object('responses',count(*),'suppressed',count(*)<5,'counts',case when count(*)>=5 then
          (select jsonb_agg((select count(*) from public.survey_responses rr where rr.survey_id=s.id and rr.withdrawn_at is null and rr.option_index=i) order by i)
            from generate_series(0,jsonb_array_length(s.options)-1) i) else null end)
         from public.survey_responses r where r.survey_id=s.id and r.withdrawn_at is null)
        else null end
    ) order by s.created_at desc,s.id),'[]'::jsonb) into v_surveys
    from public.community_surveys s where exists(select 1 from public.community_members m where m.community_id=s.community_id and m.user_id=v_user);
  end if;
  return jsonb_build_object('plan',v_plan,'registered',v_registered,
    'quota',jsonb_build_object('limit',v_limit,'used',v_used,'remaining',greatest(0,v_limit-v_used),
      'resetsAt',(v_day+1)::timestamp at time zone 'America/Argentina/Buenos_Aires','timeZone','America/Argentina/Buenos_Aires'),
    'proposals',case when v_registered then coalesce((select jsonb_agg(public.workspace_proposal(p) order by p.submitted_at desc,p.id) from public.question_proposals p where p.user_id=v_user),'[]'::jsonb) else '[]'::jsonb end,
    'reviewQueue',case when v_admin then coalesce((select jsonb_agg(public.workspace_proposal(p) order by (p.priority='priority') desc,p.submitted_at,p.id) from public.question_proposals p where p.status='pending'),'[]'::jsonb) else '[]'::jsonb end,
    'accounts',case when v_admin then coalesce((select jsonb_agg(jsonb_build_object('userId',p.id,'username',p.username,'plan',u.plan) order by p.username) from public.profiles p join public.user_plans u on u.user_id=p.id),'[]'::jsonb) else '[]'::jsonb end,
    'communities',v_communities,'surveys',v_surveys,
    'analytics',case when v_registered and v_plan='enterprise' then public.workspace_analytics(null)||jsonb_build_object('registeredUsers',(select count(*) from public.profiles)) else null end);
end;
$$;

create function public.workspace_action(p_input jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_plan text; v_action text; v_now timestamptz; v_day date; v_limit integer;
  v_question jsonb; v_community public.communities; v_proposal public.question_proposals; v_survey public.community_surveys;
  v_id uuid; v_target uuid; v_owner_plan text; v_note text; v_decision text; v_options jsonb; v_option integer; v_enabled boolean;
begin
  if v_user is null or not exists(select 1 from public.profiles where id=v_user) then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  -- The row serializes every proposal with plan changes. Every submission, including a
  -- rejection, counts; a plan upgrade never erases today's usage.
  select plan into v_plan from public.user_plans where user_id=v_user for update;
  v_now := clock_timestamp();
  v_day := (v_now at time zone 'America/Argentina/Buenos_Aires')::date;
  v_action := public.workspace_text(p_input,'action',1,40);
  if v_action='propose' then
    perform public.workspace_shape(p_input,array['action','question'],array['communityId']);
    v_question := public.workspace_question(p_input->'question');
    if (v_question->>'closesAt')::timestamptz<=v_now then raise exception 'Question deadline has passed' using errcode='22023'; end if;
    if p_input ? 'communityId' then
      v_id := public.workspace_id(p_input,'communityId');
      select * into v_community from public.communities where id=v_id;
      if not found then raise exception 'Community not found' using errcode='P0002'; end if;
      select plan into v_owner_plan from public.user_plans where user_id=v_community.owner_id;
      if not ((v_community.owner_id=v_user and v_plan in ('community','enterprise')) or
        (v_owner_plan='enterprise' and exists(select 1 from public.community_members where community_id=v_id and user_id=v_user and role='curator'))) then
        raise exception 'Community owner or authorized curator required' using errcode='42501';
      end if;
    end if;
    v_limit := case when v_plan='free' then 1 else 10 end;
    if (select count(*) from public.question_proposals where user_id=v_user and quota_day=v_day)>=v_limit then
      raise exception 'Daily question quota reached' using errcode='PT429';
    end if;
    insert into public.question_proposals(user_id,question,community_id,plan,priority,submitted_at,quota_day)
      values(v_user,v_question,v_id,v_plan,case when v_plan='free' then 'normal' else 'priority' end,v_now,v_day);
  elsif v_action='review' then
    perform public.workspace_shape(p_input,array['action','proposalId','decision','note']);
    if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
    v_note := public.workspace_text(p_input,'note',5,1000);
    v_decision := public.workspace_text(p_input,'decision',1,10);
    if v_decision not in ('approve','reject') then raise exception 'Invalid review decision' using errcode='22023'; end if;
    select * into v_proposal from public.question_proposals where id=public.workspace_id(p_input,'proposalId') for update;
    if not found then raise exception 'Proposal not found' using errcode='P0002'; end if;
    if v_proposal.status<>'pending' then raise exception 'Proposal already reviewed' using errcode='22023'; end if;
    if v_decision='approve' then
      v_question := public.workspace_question(v_proposal.question);
      if (v_question->>'closesAt')::timestamptz<=clock_timestamp() then raise exception 'Question deadline has passed' using errcode='22023'; end if;
      insert into public.questions(title,description,category,horizon,opens_at,closes_at,resolves_at,resolution_criteria,source_name,source_url,visual,is_demo)
        values(v_question->>'title',v_question->>'description',v_question->>'category',v_question->>'horizon',
          (v_question->>'opensAt')::timestamptz,(v_question->>'closesAt')::timestamptz,(v_question->>'resolvesAt')::timestamptz,
          v_question->>'resolutionCriteria',v_question->>'sourceName',v_question->>'sourceUrl',v_question->>'visual',false) returning id into v_id;
      update public.questions set status='PUBLISHED' where id=v_id;
    end if;
    update public.question_proposals set status=case when v_decision='approve' then 'approved' else 'rejected' end,
      reviewed_at=clock_timestamp(),reviewed_by=v_user,review_note=v_note,published_question_id=v_id where id=v_proposal.id;
  elsif v_action='set_plan' then
    perform public.workspace_shape(p_input,array['action','userId','plan']);
    if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
    v_owner_plan := public.workspace_text(p_input,'plan',1,20);
    if v_owner_plan not in ('free','pro','community','enterprise') then raise exception 'Invalid plan' using errcode='22023'; end if;
    update public.user_plans set plan=v_owner_plan,updated_at=clock_timestamp(),updated_by=v_user where user_id=public.workspace_id(p_input,'userId');
    if not found then raise exception 'User not found' using errcode='P0002'; end if;
  elsif v_action='create_community' then
    perform public.workspace_shape(p_input,array['action','name','description']);
    if v_plan not in ('community','enterprise') then raise exception 'Community plan required' using errcode='42501'; end if;
    insert into public.communities(owner_id,name,description) values(v_user,public.workspace_text(p_input,'name',3,60),public.workspace_text(p_input,'description',10,500)) returning id into v_id;
    insert into public.community_members(community_id,user_id,role) values(v_id,v_user,'owner');
  elsif v_action='join_community' then
    perform public.workspace_shape(p_input,array['action','code']);
    v_note := upper(public.workspace_text(p_input,'code',6,16));
    if v_note !~ '^[A-Z0-9]{6,16}$' then raise exception 'Invalid invitation code' using errcode='22023'; end if;
    select id into v_id from public.communities where code=v_note;
    if not found then raise exception 'Invitation code not found' using errcode='P0002'; end if;
    insert into public.community_members(community_id,user_id) values(v_id,v_user) on conflict do nothing;
  elsif v_action='set_curator' then
    perform public.workspace_shape(p_input,array['action','communityId','userId','enabled']);
    v_id := public.workspace_id(p_input,'communityId'); v_target := public.workspace_id(p_input,'userId');
    if v_plan<>'enterprise' or not exists(select 1 from public.communities where id=v_id and owner_id=v_user) then
      raise exception 'Enterprise community owner required' using errcode='42501';
    end if;
    if jsonb_typeof(p_input->'enabled') is distinct from 'boolean' then raise exception 'Invalid curator flag' using errcode='22023'; end if;
    v_enabled := (p_input->>'enabled')::boolean;
    update public.community_members set role=case when v_enabled then 'curator' else 'member' end where community_id=v_id and user_id=v_target and role<>'owner';
    if not found then raise exception 'Community member not found' using errcode='P0002'; end if;
  elsif v_action='create_survey' then
    perform public.workspace_shape(p_input,array['action','communityId','title','purpose','options','closesAt']);
    v_id := public.workspace_id(p_input,'communityId');
    if v_plan<>'enterprise' or not exists(select 1 from public.communities where id=v_id and owner_id=v_user) then
      raise exception 'Enterprise community owner required' using errcode='42501';
    end if;
    if public.workspace_time(p_input,'closesAt')<=v_now then raise exception 'Survey deadline has passed' using errcode='22023'; end if;
    v_options := p_input->'options';
    if jsonb_typeof(v_options) is distinct from 'array' then raise exception 'Invalid survey options' using errcode='22023'; end if;
    if jsonb_array_length(v_options) not between 2 and 6 or exists(select 1 from jsonb_array_elements(v_options) o where jsonb_typeof(o)<>'string' or char_length(btrim(o#>>'{}')) not between 1 and 100) then
      raise exception 'Invalid survey options' using errcode='22023';
    end if;
    if (select count(distinct lower(btrim(o#>>'{}'))) from jsonb_array_elements(v_options) o)<>jsonb_array_length(v_options) then
      raise exception 'Survey options must be distinct' using errcode='22023';
    end if;
    select jsonb_agg(btrim(o#>>'{}') order by n) into v_options from jsonb_array_elements(v_options) with ordinality as x(o,n);
    insert into public.community_surveys(community_id,owner_id,title,purpose,options,closes_at)
      values(v_id,v_user,public.workspace_text(p_input,'title',10,180),public.workspace_text(p_input,'purpose',20,1000),v_options,public.workspace_time(p_input,'closesAt'));
  elsif v_action='answer_survey' then
    perform public.workspace_shape(p_input,array['action','surveyId','optionIndex','consent']);
    select * into v_survey from public.community_surveys where id=public.workspace_id(p_input,'surveyId') for update;
    if not found then raise exception 'Survey not found' using errcode='P0002'; end if;
    if not exists(select 1 from public.community_members where community_id=v_survey.community_id and user_id=v_user)
      or not exists(select 1 from public.user_plans where user_id=v_survey.owner_id and plan='enterprise') then
      raise exception 'Active Enterprise community membership required' using errcode='42501';
    end if;
    if v_survey.closes_at<=clock_timestamp() then raise exception 'Survey is closed' using errcode='22023'; end if;
    if p_input->'consent' is distinct from 'true'::jsonb then raise exception 'Explicit consent required' using errcode='22023'; end if;
    if jsonb_typeof(p_input->'optionIndex') is distinct from 'number' or (p_input->>'optionIndex')::numeric<>trunc((p_input->>'optionIndex')::numeric)
      or (p_input->>'optionIndex')::numeric not between 0 and jsonb_array_length(v_survey.options)-1 then
      raise exception 'Invalid survey option' using errcode='22023';
    end if;
    v_option := (p_input->>'optionIndex')::numeric::integer;
    insert into public.survey_responses(survey_id,user_id,option_index,consent_at,consent_version)
      values(v_survey.id,v_user,v_option,clock_timestamp(),'survey-purpose-v1');
  elsif v_action='withdraw_survey' then
    perform public.workspace_shape(p_input,array['action','surveyId']);
    -- Withdrawal works after closing, downgrade, and loss of membership. Only a
    -- tombstone remains so there can be no second response or response reconstruction.
    update public.survey_responses set option_index=null,consent_at=null,consent_version=null,withdrawn_at=clock_timestamp()
      where survey_id=public.workspace_id(p_input,'surveyId') and user_id=v_user and withdrawn_at is null;
  else
    raise exception 'Unknown workspace action' using errcode='22023';
  end if;
  return public.get_workspace();
end;
$$;

revoke all on function public.initialize_user_plan(),public.workspace_shape(jsonb,text[],text[]),
  public.workspace_text(jsonb,text,integer,integer),public.workspace_id(jsonb,text),public.workspace_time(jsonb,text),
  public.workspace_question(jsonb),public.workspace_analytics(uuid),public.workspace_proposal(public.question_proposals),
  public.get_workspace(),public.workspace_action(jsonb) from public,anon,authenticated;
grant execute on function public.get_workspace() to anon,authenticated;
grant execute on function public.workspace_action(jsonb) to authenticated;
