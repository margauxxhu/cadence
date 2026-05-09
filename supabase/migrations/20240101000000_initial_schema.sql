-- ─── Enums ────────────────────────────────────────────────────────────────────

create type lesson_status as enum ('scheduled', 'cancelled', 'rescheduled', 'completed');

-- ─── Tables ───────────────────────────────────────────────────────────────────

create table families (
  id           uuid primary key default gen_random_uuid(),
  parent_name  text not null,
  parent_email text not null unique,
  created_at   timestamptz not null default now()
);

create table students (
  id        uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name      text not null,
  active    boolean not null default true
);

create table availability_template (
  id         uuid primary key default gen_random_uuid(),
  weekday    smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time   time not null,
  check (end_time > start_time)
);

create table blackouts (
  id         uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date   date not null,
  reason     text,
  check (end_date >= start_date)
);

create table recurring_assignments (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references students(id) on delete cascade,
  weekday          smallint not null check (weekday between 0 and 6),
  start_time       time not null,
  duration_minutes integer not null default 45 check (duration_minutes > 0),
  active_from      date not null,
  active_until     date
);

create table lessons (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references students(id) on delete cascade,
  scheduled_at     timestamptz not null,
  duration_minutes integer not null default 45,
  status           lesson_status not null default 'scheduled',
  note             text,
  parent_lesson_id uuid references lessons(id) on delete set null,
  late_cancel      boolean not null default false,
  created_at       timestamptz not null default now()
);

-- Single-row settings table; teacher_uid populated after first login
create table teacher_settings (
  id           integer primary key default 1 check (id = 1),
  ical_token   text not null default gen_random_uuid()::text,
  teacher_uid  uuid
);
insert into teacher_settings (id) values (1);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

-- Idempotency guard: one scheduled row per student per timeslot
create unique index lessons_unique_scheduled_slot
  on lessons(student_id, scheduled_at)
  where status = 'scheduled';

create index lessons_scheduled_at_idx on lessons(scheduled_at);
create index lessons_status_idx       on lessons(status);
create index lessons_student_id_idx   on lessons(student_id);
create index students_family_id_idx   on students(family_id);
create index recurring_weekday_idx    on recurring_assignments(weekday);
create index recurring_student_idx    on recurring_assignments(student_id);
create index blackouts_date_range_idx on blackouts(start_date, end_date);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table families              enable row level security;
alter table students              enable row level security;
alter table availability_template enable row level security;
alter table blackouts             enable row level security;
alter table recurring_assignments enable row level security;
alter table lessons               enable row level security;
alter table teacher_settings      enable row level security;

-- Returns true when the caller is the registered teacher
create or replace function is_teacher()
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from teacher_settings
    where teacher_uid = auth.uid()
  )
$$;

-- Returns the family_id for the currently authenticated parent
create or replace function my_family_id()
returns uuid
language sql stable security definer
as $$
  select id from families
  where parent_email = (select email from auth.users where id = auth.uid())
  limit 1
$$;

-- Teacher: unrestricted access to every table
create policy "teacher_all_families"      on families             for all using (is_teacher()) with check (is_teacher());
create policy "teacher_all_students"      on students             for all using (is_teacher()) with check (is_teacher());
create policy "teacher_all_availability"  on availability_template for all using (is_teacher()) with check (is_teacher());
create policy "teacher_all_blackouts"     on blackouts            for all using (is_teacher()) with check (is_teacher());
create policy "teacher_all_assignments"   on recurring_assignments for all using (is_teacher()) with check (is_teacher());
create policy "teacher_all_lessons"       on lessons              for all using (is_teacher()) with check (is_teacher());
create policy "teacher_read_settings"     on teacher_settings      for select using (is_teacher());
create policy "teacher_update_settings"   on teacher_settings      for update using (is_teacher()) with check (is_teacher());

-- Parents: own family only
create policy "parent_read_family"   on families for select using (id = my_family_id());
create policy "parent_read_students" on students for select using (family_id = my_family_id());

create policy "parent_read_lessons" on lessons for select using (
  student_id in (select id from students where family_id = my_family_id())
);

-- Parents may update (cancel) their own students' lessons; Server Action enforces business rules
create policy "parent_update_lessons" on lessons for update
  using (student_id in (select id from students where family_id = my_family_id()))
  with check (student_id in (select id from students where family_id = my_family_id()));
