-- Replace flat availability_template with period-scoped availability

create table availability_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  check (end_date >= start_date)
);

create table availability_windows (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references availability_periods(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);

create table period_exceptions (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references availability_periods(id) on delete cascade,
  exception_date date not null,
  reason text,
  unique (period_id, exception_date)
);

create index avail_windows_period_idx on availability_windows(period_id);
create index period_exceptions_period_idx on period_exceptions(period_id);

-- RLS
alter table availability_periods enable row level security;
alter table availability_windows enable row level security;
alter table period_exceptions enable row level security;

-- Teacher: full access
create policy "teacher_full_avail_periods"    on availability_periods  for all using (is_teacher()) with check (is_teacher());
create policy "teacher_full_avail_windows"    on availability_windows  for all using (is_teacher()) with check (is_teacher());
create policy "teacher_full_period_exceptions" on period_exceptions     for all using (is_teacher()) with check (is_teacher());

-- Authenticated users (parents need read access for reschedule slot generation)
create policy "auth_read_avail_periods"    on availability_periods  for select using (auth.uid() is not null);
create policy "auth_read_avail_windows"    on availability_windows  for select using (auth.uid() is not null);
create policy "auth_read_period_exceptions" on period_exceptions     for select using (auth.uid() is not null);

-- Remove old flat table
drop table if exists availability_template;
