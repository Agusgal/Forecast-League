-- Additive migration: existing profiles/accounts remain valid.
-- Personal information is separate from the publicly readable profiles table.
create table public.registration_details (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  birth_country text not null check (birth_country = any(array['AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT','ZA','ZM','ZW'])),
  residence_country text not null check (residence_country = any(array['AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT','ZA','ZM','ZW'])),
  age_at_registration integer not null check (age_at_registration between 1 and 120),
  sex text not null check (sex in ('female','male','intersex','other','undisclosed')),
  education text check (education in ('primary','secondary','tertiary','university','postgraduate','other')),
  city text check (char_length(city) between 1 and 100),
  neighborhood text check (char_length(neighborhood) between 1 and 100),
  occupation text check (char_length(occupation) between 1 and 100),
  annual_income numeric check (annual_income between 0 and 1000000000000),
  income_currency text check (income_currency in ('ARS','USD','EUR','BRL','CLP','UYU','GBP')),
  created_at timestamptz not null default now(),
  check ((annual_income is null) = (income_currency is null))
);
alter table public.registration_details enable row level security;
revoke all on public.registration_details from public, anon, authenticated;
grant select on public.registration_details to authenticated;
create policy registration_details_owner on public.registration_details
  for select to authenticated using (user_id = auth.uid());

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare details jsonb := new.raw_user_meta_data -> 'personal_data';
begin
  if details is null or jsonb_typeof(details) <> 'object' then
    raise exception 'Completá los datos personales obligatorios.';
  end if;
  -- The caller cannot choose an admin role or public residence country.
  insert into public.profiles(id,username) values(
    new.id, coalesce(nullif(btrim(new.raw_user_meta_data ->> 'username'),''),
    'forecaster_' || substr(replace(new.id::text,'-',''),1,20)));
  insert into public.registration_details(user_id,birth_country,residence_country,
    age_at_registration,sex,education,city,neighborhood,occupation,annual_income,income_currency)
  values(new.id, details->>'birthCountry', details->>'residenceCountry',
    (details->>'age')::integer, details->>'sex', details->>'education',
    details->>'city', details->>'neighborhood', details->>'occupation',
    (details->>'annualIncome')::numeric, details->>'incomeCurrency');
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public,anon,authenticated;

-- Capability check: fail signup before creating an account on an unmigrated DB.
create function public.registration_ready() returns boolean
language sql stable set search_path = '' as $$ select true; $$;
revoke all on function public.registration_ready() from public;
grant execute on function public.registration_ready() to anon,authenticated;
