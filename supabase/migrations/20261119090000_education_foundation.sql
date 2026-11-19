-- Education tenant, membership, and course foundation.
-- School membership is provisioned by a trusted administrator; users cannot
-- choose their own role or create a school-admin membership from the client.

create type public.education_role as enum ('student', 'teacher', 'admin', 'parent');
create type public.membership_status as enum ('active', 'suspended', 'ended');
create type public.course_membership_role as enum ('student', 'teacher');

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or length(display_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.school_memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.education_role not null,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (school_id, user_id),
  unique (school_id, id)
);

create table public.student_guardians (
  school_id uuid not null,
  student_user_id uuid not null,
  guardian_user_id uuid not null,
  relationship text check (relationship is null or length(relationship) <= 40),
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  primary key (school_id, student_user_id, guardian_user_id),
  foreign key (school_id, student_user_id)
    references public.school_memberships (school_id, user_id) on delete cascade,
  foreign key (school_id, guardian_user_id)
    references public.school_memberships (school_id, user_id) on delete cascade,
  check (student_user_id <> guardian_user_id)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 160),
  description text check (description is null or length(description) <= 2000),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, id)
);

create table public.course_memberships (
  school_id uuid not null,
  course_id uuid not null,
  user_id uuid not null,
  role public.course_membership_role not null,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  primary key (course_id, user_id),
  foreign key (school_id, course_id)
    references public.courses (school_id, id) on delete cascade,
  foreign key (school_id, user_id)
    references public.school_memberships (school_id, user_id) on delete cascade
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  course_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 200),
  content text not null check (length(content) <= 100000),
  revision integer not null default 1 check (revision > 0),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, id),
  foreign key (school_id, course_id)
    references public.courses (school_id, id) on delete cascade
);

create function public.enroll_course_creator_as_teacher()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.school_memberships sm
    where sm.school_id = new.school_id
      and sm.user_id = new.created_by
      and sm.role = 'teacher'
      and sm.status = 'active'
  ) then
    insert into public.course_memberships (school_id, course_id, user_id, role)
    values (new.school_id, new.id, new.created_by, 'teacher')
    on conflict (course_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger enroll_course_creator after insert on public.courses
  for each row execute function public.enroll_course_creator_as_teacher();

create index school_memberships_user_active_idx
  on public.school_memberships (user_id, status, school_id);
create index school_memberships_school_role_idx
  on public.school_memberships (school_id, role, status);
create index student_guardians_guardian_idx
  on public.student_guardians (school_id, guardian_user_id, status);
create index course_memberships_user_idx
  on public.course_memberships (school_id, user_id, status, role);
create index lessons_course_idx on public.lessons (school_id, course_id, created_at);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger schools_set_updated_at before update on public.schools
  for each row execute function public.set_updated_at();
create trigger courses_set_updated_at before update on public.courses
  for each row execute function public.set_updated_at();
create trigger lessons_set_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();

create function public.prevent_creator_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'created_by cannot be changed';
  end if;
  return new;
end;
$$;

create trigger courses_creator_immutable before update on public.courses
  for each row execute function public.prevent_creator_change();
create trigger lessons_creator_immutable before update on public.lessons
  for each row execute function public.prevent_creator_change();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (user_id, display_name)
select
  u.id,
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'display_name', '')), '')
from auth.users u
on conflict (user_id) do nothing;

-- These SECURITY DEFINER predicates avoid recursive RLS evaluation while
-- reading membership tables. They expose only boolean checks to authenticated users.
create function public.has_active_school_role(
  target_school_id uuid,
  allowed_roles public.education_role[] default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.school_memberships sm
    where sm.school_id = target_school_id
      and sm.user_id = (select auth.uid())
      and sm.status = 'active'
      and (allowed_roles is null or sm.role = any (allowed_roles))
  );
$$;

create function public.has_active_course_role(
  target_school_id uuid,
  target_course_id uuid,
  allowed_roles public.course_membership_role[] default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.course_memberships cm
    join public.school_memberships sm
      on sm.school_id = cm.school_id and sm.user_id = cm.user_id
    where cm.school_id = target_school_id
      and cm.course_id = target_course_id
      and cm.user_id = (select auth.uid())
      and cm.status = 'active'
      and sm.status = 'active'
      and (allowed_roles is null or cm.role = any (allowed_roles))
  );
$$;

create function public.is_linked_student_guardian(
  target_school_id uuid,
  target_student_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.student_guardians sg
    where sg.school_id = target_school_id
      and sg.student_user_id = target_student_id
      and sg.guardian_user_id = (select auth.uid())
      and sg.status = 'active'
  );
$$;

revoke all on function public.has_active_school_role(uuid, public.education_role[]) from public;
revoke all on function public.has_active_course_role(uuid, uuid, public.course_membership_role[]) from public;
revoke all on function public.is_linked_student_guardian(uuid, uuid) from public;
grant execute on function public.has_active_school_role(uuid, public.education_role[]) to authenticated;
grant execute on function public.has_active_course_role(uuid, uuid, public.course_membership_role[]) to authenticated;
grant execute on function public.is_linked_student_guardian(uuid, uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.schools enable row level security;
alter table public.school_memberships enable row level security;
alter table public.student_guardians enable row level security;
alter table public.courses enable row level security;
alter table public.course_memberships enable row level security;
alter table public.lessons enable row level security;

create policy "Users read their own profile"
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Members read their schools"
  on public.schools for select to authenticated
  using (public.has_active_school_role(id));

create policy "Users read own or school-admin memberships"
  on public.school_memberships for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_active_school_role(school_id, array['admin']::public.education_role[])
  );

create policy "Students and linked guardians read guardian links"
  on public.student_guardians for select to authenticated
  using (
    (student_user_id = (select auth.uid()) and public.has_active_school_role(school_id))
    or public.is_linked_student_guardian(school_id, student_user_id)
    or public.has_active_school_role(school_id, array['admin']::public.education_role[])
  );

create policy "Course members and school admins read courses"
  on public.courses for select to authenticated
  using (
    public.has_active_school_role(school_id, array['admin']::public.education_role[])
    or public.has_active_course_role(school_id, id)
  );
create policy "School admins and course teachers create courses"
  on public.courses for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      public.has_active_school_role(school_id, array['admin']::public.education_role[])
      or public.has_active_school_role(school_id, array['teacher']::public.education_role[])
    )
  );
create policy "School admins and course teachers update courses"
  on public.courses for update to authenticated
  using (
    public.has_active_school_role(school_id, array['admin']::public.education_role[])
    or (
      created_by = (select auth.uid())
      and public.has_active_school_role(school_id, array['teacher']::public.education_role[])
    )
    or public.has_active_course_role(
      school_id, id, array['teacher']::public.course_membership_role[]
    )
  )
  with check (
    public.has_active_school_role(school_id, array['admin']::public.education_role[])
    or (
      created_by = (select auth.uid())
      and public.has_active_school_role(school_id, array['teacher']::public.education_role[])
    )
    or public.has_active_course_role(
      school_id, id, array['teacher']::public.course_membership_role[]
    )
  );

create policy "Course members and school admins read course memberships"
  on public.course_memberships for select to authenticated
  using (
    user_id = (select auth.uid())
    or
    public.has_active_school_role(school_id, array['admin']::public.education_role[])
    or public.has_active_course_role(
      school_id, course_id, array['teacher']::public.course_membership_role[]
    )
  );

create policy "Course members and school admins read lessons"
  on public.lessons for select to authenticated
  using (
    public.has_active_school_role(school_id, array['admin']::public.education_role[])
    or public.has_active_course_role(school_id, course_id)
  );
create policy "Course teachers and school admins create lessons"
  on public.lessons for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      public.has_active_school_role(school_id, array['admin']::public.education_role[])
      or public.has_active_course_role(
        school_id, course_id, array['teacher']::public.course_membership_role[]
      )
    )
  );
create policy "Course teachers and school admins update lessons"
  on public.lessons for update to authenticated
  using (
    public.has_active_school_role(school_id, array['admin']::public.education_role[])
    or public.has_active_course_role(
      school_id, course_id, array['teacher']::public.course_membership_role[]
    )
  )
  with check (
    public.has_active_school_role(school_id, array['admin']::public.education_role[])
    or public.has_active_course_role(
      school_id, course_id, array['teacher']::public.course_membership_role[]
    )
  );

-- Membership, guardian-link, and course-enrollment writes are intentionally
-- withheld from authenticated clients until a trusted invitation/admin flow exists.
