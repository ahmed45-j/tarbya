-- =====================================================================
-- منارة التكاليف — Schema.sql
-- شغّل هذا الملف كامل في Supabase: Project > SQL Editor > New query
-- يفترض هذا الملف وجود auth.users و auth.uid() الجاهزين في Supabase
-- =====================================================================

create extension if not exists "pgcrypto";

-- التاريخ current_date المستخدم في كل الدوال (تسجيل الإنجاز، الـ Streak، لوحة الصدارة)
-- يعتمد على توقيت قاعدة البيانات. نضبطه على توقيت القاهرة حتى يتوافق "اليوم" مع
-- توقيت الطلاب الفعلي، لا توقيت UTC. غيّر 'Africa/Cairo' إذا اختلف توقيت أكاديميتك.
do $$
begin
  execute format('alter database %I set timezone to %L', current_database(), 'Africa/Cairo');
end $$;

-- ---------------------------------------------------------------------
-- 1) الأنواع (Enums)
-- ---------------------------------------------------------------------
create type user_role as enum ('admin', 'teacher', 'student');
create type assignment_type as enum ('daily', 'weekly', 'multiple');

-- ---------------------------------------------------------------------
-- 2) الجداول
-- ---------------------------------------------------------------------

-- ملف كل مستخدم (يمتد من auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'student',
  full_name text not null,
  group_id uuid, -- يُضاف عليه FK بعد إنشاء جدول groups
  created_at timestamptz not null default now()
);

-- المجموعات
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null default '⭐',
  teacher_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_group_fk foreign key (group_id) references public.groups(id) on delete set null;

-- التكليفات
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type assignment_type not null default 'daily',
  points int not null default 10 check (points >= 0),
  times_required int not null default 1 check (times_required >= 1),
  needs_description boolean not null default false,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ربط التكليف بمجموعة أو أكثر
create table public.assignment_groups (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  primary key (assignment_id, group_id)
);

-- رسائل التشجيع (أكثر من رسالة لكل تكليف، تُختار عشوائيًا)
create table public.encouragement_messages (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  message text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- سجل الإنجاز (صف واحد لكل طالب/تكليف/يوم)
create table public.completions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  occurred_on date not null default current_date,
  times_completed int not null default 0 check (times_completed >= 0),
  description text,
  points_earned numeric not null default 0,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, assignment_id, occurred_on)
);

-- ملاحظات المعلم على الطالب (خاصة، لا يراها الطالب في MVP)
create table public.teacher_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index idx_completions_student_date on public.completions(student_id, occurred_on);
create index idx_completions_assignment on public.completions(assignment_id);
create index idx_profiles_group on public.profiles(group_id);
create index idx_assignment_groups_group on public.assignment_groups(group_id);

-- ---------------------------------------------------------------------
-- 3) دوال مساعدة للصلاحيات (Security helper functions)
-- ---------------------------------------------------------------------

-- ملاحظة مهمة: كل دوال الصلاحيات هنا SECURITY DEFINER + row_security = off
-- لأنها تُستدعى من داخل سياسات RLS على جداول أخرى (وأحيانًا نفس الجدول)،
-- فلو تركنا RLS شغالة داخلها ممكن يحصل Infinite recursion بين الجداول.
-- الدالة نفسها تقوم بالفحص المطلوب بأمان (auth.uid() + شرط محدد)، فتعطيل RLS
-- داخلها فقط لا يفتح أي ثغرة لأن كل استعلام بداخلها مُقيّد يدويًا بالفعل.

create or replace function public.current_role_is(p_role user_role)
returns boolean language sql stable security definer set search_path = public set row_security = off as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = p_role);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public set row_security = off as $$
  select public.current_role_is('admin');
$$;

create or replace function public.my_group_id()
returns uuid language sql stable security definer set search_path = public set row_security = off as $$
  select group_id from public.profiles where id = auth.uid();
$$;

-- هل الطالب p_student ضمن مجموعة يدرّسها المعلم الحالي؟
create or replace function public.teaches_student(p_student uuid)
returns boolean language sql stable security definer set search_path = public set row_security = off as $$
  select exists (
    select 1 from public.profiles s
    join public.groups g on g.id = s.group_id
    where s.id = p_student and g.teacher_id = auth.uid()
  );
$$;

create or replace function public.teaches_group(p_group uuid)
returns boolean language sql stable security definer set search_path = public set row_security = off as $$
  select exists (select 1 from public.groups where id = p_group and teacher_id = auth.uid());
$$;

-- هل التكليف p_assignment ظاهر لطالب عبر مجموعته؟ (لتفادي recursion بين assignments/assignment_groups)
create or replace function public.assignment_visible_to_student(p_assignment_id uuid)
returns boolean language sql stable security definer set search_path = public set row_security = off as $$
  select exists (
    select 1 from public.assignment_groups ag
    join public.profiles p on p.group_id = ag.group_id
    where ag.assignment_id = p_assignment_id and p.id = auth.uid()
  );
$$;

-- هل التكليف p_assignment ظاهر لمعلم عبر إحدى مجموعاته؟
create or replace function public.assignment_visible_to_teacher(p_assignment_id uuid)
returns boolean language sql stable security definer set search_path = public set row_security = off as $$
  select exists (
    select 1 from public.assignment_groups ag
    join public.groups g on g.id = ag.group_id
    where ag.assignment_id = p_assignment_id and g.teacher_id = auth.uid()
  );
$$;

-- هل التكليف p_assignment أنشأه المستخدم الحالي؟ (لتفادي recursion من داخل سياسة assignment_groups)
create or replace function public.assignment_owned_by_me(p_assignment_id uuid)
returns boolean language sql stable security definer set search_path = public set row_security = off as $$
  select exists (select 1 from public.assignments where id = p_assignment_id and created_by = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 4) تريجر: إنشاء profile تلقائيًا عند تسجيل مستخدم جديد
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
    'student' -- الدور الافتراضي؛ الـ Admin يرفعه لاحقًا من لوحة التحكم
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 5) تفعيل RLS على كل الجداول
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_groups enable row level security;
alter table public.encouragement_messages enable row level security;
alter table public.completions enable row level security;
alter table public.teacher_notes enable row level security;

-- ---------------- profiles ----------------
create policy "profiles: admin full access" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

create policy "profiles: user reads own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles: user updates own (not role/group)" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy "profiles: teacher reads own students" on public.profiles
  for select using (public.teaches_student(id));

-- ---------------- groups ----------------
create policy "groups: admin full access" on public.groups
  for all using (public.is_admin()) with check (public.is_admin());

create policy "groups: teacher reads own group" on public.groups
  for select using (teacher_id = auth.uid());

create policy "groups: student reads own group" on public.groups
  for select using (id = public.my_group_id());

-- ---------------- assignments ----------------
create policy "assignments: admin full access" on public.assignments
  for all using (public.is_admin()) with check (public.is_admin());

create policy "assignments: teacher manages own" on public.assignments
  for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy "assignments: student reads active assigned to own group" on public.assignments
  for select using (active = true and public.assignment_visible_to_student(id));

create policy "assignments: teacher reads assigned to own groups" on public.assignments
  for select using (public.assignment_visible_to_teacher(id));

-- ---------------- assignment_groups ----------------
create policy "assignment_groups: admin full access" on public.assignment_groups
  for all using (public.is_admin()) with check (public.is_admin());

create policy "assignment_groups: teacher manages own links" on public.assignment_groups
  for all using (public.teaches_group(group_id) and public.assignment_owned_by_me(assignment_id))
  with check (public.teaches_group(group_id) and public.assignment_owned_by_me(assignment_id));

create policy "assignment_groups: student reads own group links" on public.assignment_groups
  for select using (group_id = public.my_group_id());

create policy "assignment_groups: teacher reads own group links" on public.assignment_groups
  for select using (public.teaches_group(group_id));

-- ---------------- encouragement_messages ----------------
create policy "messages: admin full access" on public.encouragement_messages
  for all using (public.is_admin()) with check (public.is_admin());

create policy "messages: teacher manages for own assignments" on public.encouragement_messages
  for all using (exists (select 1 from public.assignments a where a.id = assignment_id and a.created_by = auth.uid()))
  with check (exists (select 1 from public.assignments a where a.id = assignment_id and a.created_by = auth.uid()));

create policy "messages: student reads for visible assignments" on public.encouragement_messages
  for select using (
    exists (
      select 1 from public.assignment_groups ag
      where ag.assignment_id = encouragement_messages.assignment_id and ag.group_id = public.my_group_id()
    )
  );

-- ---------------- completions ----------------
create policy "completions: admin full access" on public.completions
  for all using (public.is_admin()) with check (public.is_admin());

create policy "completions: student manages own" on public.completions
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "completions: teacher reads own students'" on public.completions
  for select using (public.teaches_student(student_id));

-- ---------------- teacher_notes ----------------
create policy "notes: admin full access" on public.teacher_notes
  for all using (public.is_admin()) with check (public.is_admin());

create policy "notes: teacher manages own notes for own students" on public.teacher_notes
  for all using (teacher_id = auth.uid() and public.teaches_student(student_id))
  with check (teacher_id = auth.uid() and public.teaches_student(student_id));

-- ---------------------------------------------------------------------
-- 6) دالة تسجيل الإنجاز (RPC) — القلب النابض للتطبيق
-- ---------------------------------------------------------------------
create or replace function public.record_completion(
  p_assignment_id uuid,
  p_delta int default 1,
  p_description text default null
) returns json language plpgsql security definer set search_path = public as $$
declare
  v_student uuid := auth.uid();
  v_group uuid;
  v_assignment record;
  v_row public.completions;
  v_today date := current_date;
  v_week_start date := date_trunc('week', current_date)::date;
  v_new_times int;
  v_message text;
begin
  if v_student is null then
    raise exception 'not authenticated';
  end if;

  select group_id into v_group from public.profiles where id = v_student and role = 'student';
  if v_group is null then
    raise exception 'only students can record completions';
  end if;

  select * into v_assignment from public.assignments where id = p_assignment_id and active = true;
  if v_assignment is null then
    raise exception 'assignment not found or inactive';
  end if;

  if not exists (
    select 1 from public.assignment_groups
    where assignment_id = p_assignment_id and group_id = v_group
  ) then
    raise exception 'assignment not assigned to your group';
  end if;

  if v_assignment.needs_description and (p_description is null or trim(p_description) = '') then
    raise exception 'description required';
  end if;

  if v_assignment.type = 'weekly' then
    -- الأسبوعي: صف واحد يمثل الأسبوع الحالي (occurred_on = بداية الأسبوع)
    select * into v_row from public.completions
      where student_id = v_student and assignment_id = p_assignment_id
        and date_trunc('week', occurred_on)::date = v_week_start
      limit 1;

    if v_row is null then
      insert into public.completions (student_id, assignment_id, occurred_on, times_completed, description, points_earned, submitted_at)
      values (v_student, p_assignment_id, v_week_start, 1, p_description, v_assignment.points, now())
      returning * into v_row;
    else
      update public.completions
        set times_completed = 1,
            description = coalesce(p_description, description),
            points_earned = v_assignment.points,
            submitted_at = now(),
            updated_at = now()
        where id = v_row.id
        returning * into v_row;
    end if;
  else
    -- يومي أو متعدد المرات: صف واحد لليوم، times_completed يزيد بمقدار p_delta حتى times_required
    select * into v_row from public.completions
      where student_id = v_student and assignment_id = p_assignment_id and occurred_on = v_today;

    if v_row is null then
      v_new_times := least(greatest(p_delta, 0), v_assignment.times_required);
      insert into public.completions (student_id, assignment_id, occurred_on, times_completed, description, points_earned, submitted_at)
      values (
        v_student, p_assignment_id, v_today, v_new_times, p_description,
        round(v_assignment.points::numeric * v_new_times / v_assignment.times_required),
        now()
      )
      returning * into v_row;
    else
      v_new_times := least(greatest(v_row.times_completed + p_delta, 0), v_assignment.times_required);
      update public.completions
        set times_completed = v_new_times,
            description = coalesce(p_description, description),
            points_earned = round(v_assignment.points::numeric * v_new_times / v_assignment.times_required),
            submitted_at = now(),
            updated_at = now()
        where id = v_row.id
        returning * into v_row;
    end if;
  end if;

  select message into v_message from public.encouragement_messages
    where assignment_id = p_assignment_id order by random() limit 1;

  return json_build_object(
    'completion', row_to_json(v_row),
    'message', v_message,
    'points_earned', v_row.points_earned,
    'times_completed', v_row.times_completed,
    'times_required', v_assignment.times_required
  );
end;
$$;

grant execute on function public.record_completion(uuid, int, text) to authenticated;

-- ---------------------------------------------------------------------
-- 7) دالة حساب الـ Streak
-- ---------------------------------------------------------------------
create or replace function public.get_student_streak(p_student_id uuid)
returns int language plpgsql stable security definer set search_path = public as $$
declare
  v_group uuid;
  v_day date := current_date;
  v_streak int := 0;
  v_required int;
  v_done int;
begin
  if not (
    p_student_id = auth.uid()
    or public.is_admin()
    or public.teaches_student(p_student_id)
  ) then
    raise exception 'not authorized';
  end if;

  select group_id into v_group from public.profiles where id = p_student_id;
  if v_group is null then
    return 0;
  end if;

  loop
    select count(*) into v_required
      from public.assignments a
      join public.assignment_groups ag on ag.assignment_id = a.id
      where ag.group_id = v_group and a.type in ('daily','multiple') and a.active = true
        and a.created_at::date <= v_day;

    if v_required = 0 then
      v_day := v_day - 1;
    else
      select count(*) into v_done
        from public.completions c
        join public.assignments a on a.id = c.assignment_id
        where c.student_id = p_student_id and c.occurred_on = v_day
          and a.type in ('daily','multiple') and a.active = true
          and c.times_completed >= a.times_required;

      if v_done >= v_required then
        v_streak := v_streak + 1;
        v_day := v_day - 1;
      elsif v_day = current_date then
        -- اليوم لم ينتهِ بعد، لا نكسر السلسلة، نبدأ الفحص من الأمس
        v_day := v_day - 1;
      else
        exit;
      end if;
    end if;

    exit when (current_date - v_day) > 90;
  end loop;

  return v_streak;
end;
$$;

grant execute on function public.get_student_streak(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 8) دالة لوحة الصدارة الأسبوعية لكل مجموعة
-- ---------------------------------------------------------------------
create or replace function public.get_group_leaderboard(p_group_id uuid)
returns table (
  student_id uuid,
  full_name text,
  commitment_pct numeric,
  points_this_week int,
  streak int
) language plpgsql stable security definer set search_path = public as $$
begin
  if not (
    public.is_admin()
    or public.teaches_group(p_group_id)
    or p_group_id = public.my_group_id()
  ) then
    raise exception 'not authorized';
  end if;

  return query
  with week_bounds as (
    select date_trunc('week', current_date)::date as week_start, current_date as today
  ),
  daily_units as (
    select p.id as student_id, a.id as assignment_id, d::date as occ_date,
           a.times_required, a.points,
           coalesce((
             select least(c.times_completed, a.times_required) from public.completions c
             where c.student_id = p.id and c.assignment_id = a.id and c.occurred_on = d::date
           ), 0) as done
    from public.profiles p
    cross join week_bounds wb
    cross join generate_series(wb.week_start, wb.today, interval '1 day') as d
    join public.assignment_groups ag on ag.group_id = p.group_id
    join public.assignments a on a.id = ag.assignment_id and a.type in ('daily','multiple') and a.active = true
      and a.created_at::date <= d::date
    where p.group_id = p_group_id and p.role = 'student'
  ),
  weekly_units as (
    select p.id as student_id, a.id as assignment_id, wb.week_start as occ_date,
           a.times_required, a.points,
           coalesce((
             select least(c.times_completed, a.times_required) from public.completions c
             where c.student_id = p.id and c.assignment_id = a.id
               and date_trunc('week', c.occurred_on)::date = wb.week_start
           ), 0) as done
    from public.profiles p
    cross join week_bounds wb
    join public.assignment_groups ag on ag.group_id = p.group_id
    join public.assignments a on a.id = ag.assignment_id and a.type = 'weekly' and a.active = true
      and a.created_at::date <= wb.today
    where p.group_id = p_group_id and p.role = 'student'
  ),
  all_units as (
    select * from daily_units union all select * from weekly_units
  )
  select
    pr.student_id,
    pf.full_name,
    case when sum(pr.times_required) = 0 then 0
      else round(100.0 * sum(pr.done) / sum(pr.times_required), 1)
    end as commitment_pct,
    coalesce(sum(round(pr.points::numeric * pr.done / nullif(pr.times_required, 0))), 0)::int as points_this_week,
    public.get_student_streak(pr.student_id) as streak
  from all_units pr
  join public.profiles pf on pf.id = pr.student_id
  group by pr.student_id, pf.full_name
  order by commitment_pct desc, points_this_week desc;
end;
$$;

grant execute on function public.get_group_leaderboard(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- تم. الخطوة التالية: شغّل seed.sql لإدخال بيانات تجريبية (اختياري)
-- ---------------------------------------------------------------------
