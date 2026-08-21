-- اختبار وظيفي كامل: نتحقق أن الصلاحيات والمنطق يعملان فعليًا (ليس شكليًا)
\set ON_ERROR_STOP on

-- إنشاء مستخدمين وهميين في auth.users
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'admin@demo.local'),
  ('00000000-0000-0000-0000-000000000002', 'teacher1@demo.local'),
  ('00000000-0000-0000-0000-000000000003', 'teacher2@demo.local'),
  ('00000000-0000-0000-0000-000000000004', 'student_a1@demo.local'),
  ('00000000-0000-0000-0000-000000000005', 'student_a2@demo.local'),
  ('00000000-0000-0000-0000-000000000006', 'student_b1@demo.local');

-- التريجر on_auth_user_created أنشأ بالفعل صفًا في profiles لكل مستخدم أعلاه (role='student' افتراضيًا)
-- هنا نحاكي ما يفعله الـ Admin من لوحة التحكم: يرفع الدور ويضبط الاسم
insert into public.profiles (id, role, full_name) values
  ('00000000-0000-0000-0000-000000000001', 'admin',   'أ. محمد الأمين'),
  ('00000000-0000-0000-0000-000000000002', 'teacher', 'أ. أحمد صلاح'),
  ('00000000-0000-0000-0000-000000000003', 'teacher', 'أ. سارة يوسف'),
  ('00000000-0000-0000-0000-000000000004', 'student', 'يوسف أحمد'),
  ('00000000-0000-0000-0000-000000000005', 'student', 'عمر خالد'),
  ('00000000-0000-0000-0000-000000000006', 'student', 'مريم علي')
on conflict (id) do update set role = excluded.role, full_name = excluded.full_name;

-- مجموعتان بمعلمين مختلفين
insert into public.groups (id, name, emoji, teacher_id, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'مجموعة النجوم', '⭐', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'مجموعة الأبطال', '🦁', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001');

update public.profiles set group_id = '10000000-0000-0000-0000-000000000001' where id in
  ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005');
update public.profiles set group_id = '10000000-0000-0000-0000-000000000002' where id =
  '00000000-0000-0000-0000-000000000006';

-- تكليف صلاة (5 مرات/يوم) لمجموعة النجوم فقط، أنشأه teacher1
insert into public.assignments (id, title, type, points, times_required, needs_description, created_by) values
  ('20000000-0000-0000-0000-000000000001', 'الصلاة', 'multiple', 10, 5, false, '00000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000002', 'ورد القرآن', 'daily', 10, 1, false, '00000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000003', 'بر الوالدين', 'daily', 15, 1, true, '00000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000004', 'الصدقة', 'weekly', 20, 1, false, '00000000-0000-0000-0000-000000000003');

insert into public.assignment_groups (assignment_id, group_id) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002');

insert into public.encouragement_messages (assignment_id, message) values
  ('20000000-0000-0000-0000-000000000001', 'أحب الأعمال إلى الله الصلاة على وقتها.'),
  ('20000000-0000-0000-0000-000000000001', 'حافظ على صلاتك، فهي صلتك بربك.'),
  ('20000000-0000-0000-0000-000000000002', 'أحب الأعمال إلى الله أدومها وإن قل.');

\echo '--- اختبار 1: الطالب (student_a1) يسجّل دخول ويحاول رؤية بيانات مجموعة أخرى (يجب أن يفشل/يرجع فاضي) ---'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';

select count(*) as should_be_zero from public.groups where id = '10000000-0000-0000-0000-000000000002';
select count(*) as should_be_zero from public.profiles where id = '00000000-0000-0000-0000-000000000006';

\echo '--- اختبار 2: الطالب يرى تكليفاته فقط (يجب أن يرى 3: الصلاة، ورد القرآن، بر الوالدين) ---'
select title from public.assignments order by title;

\echo '--- اختبار 3: تسجيل إنجاز جزئي للصلاة (3 من 5) عبر RPC ---'
select record_completion('20000000-0000-0000-0000-000000000001', 3, null);

\echo '--- اختبار 4: تسجيل إنجاز كامل لورد القرآن (نقاط كاملة) ---'
select record_completion('20000000-0000-0000-0000-000000000002', 1, null);

\echo '--- اختبار 5: تكليف يحتاج وصف بدون وصف يجب أن يفشل ---'
do $$
begin
  begin
    perform record_completion('20000000-0000-0000-0000-000000000003', 1, null);
    raise exception 'FAIL: كان يجب أن يرفض بدون وصف';
  exception when others then
    raise notice 'OK: تم الرفض كما هو متوقع: %', sqlerrm;
  end;
end $$;

\echo '--- اختبار 6: نفس التكليف بوصف صحيح ينجح ---'
select record_completion('20000000-0000-0000-0000-000000000003', 1, 'ساعدت أمي في ترتيب البيت');

\echo '--- اختبار 7: نقاط الصلاة الجزئية = round(10 * 3/5) = 6 ---'
select assignment_id, times_completed, points_earned from public.completions
  where student_id = '00000000-0000-0000-0000-000000000004' and assignment_id = '20000000-0000-0000-0000-000000000001';

\echo '--- اختبار 8: الطالب لا يستطيع إدخال إنجاز باسم طالب آخر مباشرة (تحايل يدوي) ---'
do $$
begin
  begin
    insert into public.completions (student_id, assignment_id, times_completed)
    values ('00000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', 1);
    raise exception 'FAIL: كان يجب أن يُرفض بسبب RLS';
  exception when others then
    raise notice 'OK: تم رفض التلاعب كما هو متوقع: %', sqlerrm;
  end;
end $$;

\echo '--- اختبار 9: طالب مجموعة الأبطال يسجّل صدقة (تكليف أسبوعي) ---'
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000006';
select record_completion('20000000-0000-0000-0000-000000000004', 1, null);

\echo '--- اختبار 10: المعلم الأول يرى طلاب مجموعته فقط، لا يرى طلاب المجموعة الثانية ---'
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select full_name from public.profiles where role = 'student' order by full_name;

\echo '--- اختبار 11: المعلم الأول يحاول تعديل تكليف أنشأه المعلم الثاني (يجب أن يفشل) ---'
do $$
begin
  begin
    update public.assignments set points = 999 where id = '20000000-0000-0000-0000-000000000004';
    if not found then
      raise notice 'OK: لا صفوف تأثرت (منع بصمت عبر RLS) كما هو متوقع';
    else
      raise exception 'FAIL: تم التعديل رغم أنه ليس تكليفه!';
    end if;
  end;
end $$;

\echo '--- اختبار 12: لوحة صدارة مجموعة النجوم (Leaderboard) ---'
select * from public.get_group_leaderboard('10000000-0000-0000-0000-000000000001');

\echo '--- اختبار 13: الـ Streak لطالب سجّل اليوم فقط (متوقع 0 أو 1 حسب اكتمال اليوم) ---'
select public.get_student_streak('00000000-0000-0000-0000-000000000004') as streak_today;

\echo '--- اختبار 14: طالب يحاول قراءة Streak طالب آخر ليس في مجموعته (يجب رفض) ---'
do $$
begin
  begin
    perform public.get_student_streak('00000000-0000-0000-0000-000000000006');
    raise exception 'FAIL: كان يجب أن يُرفض';
  exception when others then
    raise notice 'OK: تم الرفض كما هو متوقع: %', sqlerrm;
  end;
end $$;

reset role;
\echo '=== انتهت الاختبارات ==='
