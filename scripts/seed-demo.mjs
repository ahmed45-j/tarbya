// سكربت البيانات التجريبية
// التشغيل: node --env-file=.env.local scripts/seed-demo.mjs
//
// يحتاج SUPABASE_SERVICE_ROLE_KEY (من Supabase Dashboard > Project Settings > API)
// لأنه يُنشئ مستخدمين حقيقيين عبر Admin API — لا تشارك هذا المفتاح أبدًا ولا تضعه في المتصفح.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("❌ تأكد من وجود NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const DEMO_PASSWORD = "Demo@12345";

async function createUser(email, full_name, role, group_id) {
  const { data: existing } = await supabase.auth.admin.listUsers();
  const already = existing?.users.find((u) => u.email === email);
  if (already) {
    await supabase.from("profiles").update({ role, full_name, group_id }).eq("id", already.id);
    console.log(`↺ موجود بالفعل: ${email}`);
    return already.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (error) throw error;

  await supabase.from("profiles").update({ role, full_name, group_id }).eq("id", data.user.id);
  console.log(`✓ تم إنشاء: ${email}`);
  return data.user.id;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log("🌱 بدء زراعة البيانات التجريبية...\n");

  const adminId = await createUser("admin@demo.local", "أ. محمد الأمين", "admin", null);
  const teacher1Id = await createUser("teacher1@demo.local", "أ. أحمد صلاح", "teacher", null);
  const teacher2Id = await createUser("teacher2@demo.local", "أ. سارة يوسف", "teacher", null);

  async function upsertGroup(name, emoji, teacherId) {
    const { data: found } = await supabase.from("groups").select("*").eq("name", name).maybeSingle();
    if (found) return found;
    const { data, error } = await supabase
      .from("groups")
      .insert({ name, emoji, teacher_id: teacherId, created_by: adminId })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const gA = await upsertGroup("مجموعة النجوم", "⭐", teacher1Id);
  const gB = await upsertGroup("مجموعة الأبطال", "🦁", teacher2Id);
  console.log(`✓ المجموعات جاهزة: ${gA.name}, ${gB.name}`);

  const a1 = await createUser("student.a1@demo.local", "يوسف أحمد", "student", gA.id);
  const a2 = await createUser("student.a2@demo.local", "عمر خالد", "student", gA.id);
  const a3 = await createUser("student.a3@demo.local", "حمزة سعيد", "student", gA.id);
  const b1 = await createUser("student.b1@demo.local", "مريم علي", "student", gB.id);
  const b2 = await createUser("student.b2@demo.local", "فاطمة حسن", "student", gB.id);
  const b3 = await createUser("student.b3@demo.local", "زينب محمود", "student", gB.id);

  async function upsertAssignment(title, type, points, times_required, needs_description, created_by, groupIds, messages) {
    const { data: found } = await supabase.from("assignments").select("*").eq("title", title).maybeSingle();
    let assignment = found;
    if (!assignment) {
      const { data, error } = await supabase
        .from("assignments")
        .insert({ title, type, points, times_required, needs_description, created_by })
        .select()
        .single();
      if (error) throw error;
      assignment = data;

      await supabase
        .from("assignment_groups")
        .insert(groupIds.map((group_id) => ({ assignment_id: assignment.id, group_id })));

      await supabase
        .from("encouragement_messages")
        .insert(messages.map((message) => ({ assignment_id: assignment.id, message, created_by })));
    }
    return assignment;
  }

  const salah = await upsertAssignment("الصلاة", "multiple", 10, 5, false, teacher1Id, [gA.id, gB.id], [
    "أحب الأعمال إلى الله الصلاة على وقتها.",
    "حافظ على صلاتك، فهي صلتك بربك.",
    "ما شاء الله، استمر في المحافظة على الصلاة.",
  ]);
  const quran = await upsertAssignment("ورد القرآن", "daily", 10, 1, false, teacher1Id, [gA.id, gB.id], [
    "أحب الأعمال إلى الله أدومها وإن قل.",
    "القرآن شفيع لصاحبه يوم القيامة.",
  ]);
  const dhikr = await upsertAssignment("الذكر", "daily", 5, 1, false, teacher1Id, [gA.id], [
    "الذاكرون الله كثيرًا والذاكرات، أعدّ الله لهم مغفرة وأجرًا عظيمًا.",
  ]);
  const birr = await upsertAssignment("بر الوالدين", "daily", 15, 1, true, teacher1Id, [gA.id], [
    "رضا الله في رضا الوالدين.",
    "ما شاء الله، بر الوالدين من أعظم القربات!",
  ]);
  await upsertAssignment("الصيام", "weekly", 20, 1, false, teacher2Id, [gB.id], [
    "الصيام جُنّة، فمن صام يومًا في سبيل الله باعد الله وجهه عن النار.",
  ]);
  await upsertAssignment("الصدقة", "weekly", 20, 1, false, teacher2Id, [gB.id], [
    "الصدقة تطفئ الخطيئة كما يطفئ الماء النار.",
  ]);
  const hadith = await upsertAssignment("حفظ حديث", "daily", 15, 1, true, teacher2Id, [gB.id], [
    "من حفظ على أمتي أربعين حديثًا بعثه الله يوم القيامة فقيهًا عالمًا.",
  ]);

  console.log("✓ التكاليف جاهزة");

  // إنجازات تجريبية لآخر 6 أيام لإظهار Streak ونسبة التزام واقعية
  const rows = [];
  const students = [
    { id: a1, group: "A", pattern: [1, 1, 1, 1, 1, 1, 1] }, // ملتزم جدًا
    { id: a2, group: "A", pattern: [1, 0, 1, 1, 0, 1, 1] }, // متوسط
    { id: a3, group: "A", pattern: [0, 0, 1, 0, 1, 0, 1] }, // يحتاج متابعة
    { id: b1, group: "B", pattern: [1, 1, 1, 1, 1, 0, 1] },
    { id: b2, group: "B", pattern: [1, 1, 0, 1, 1, 1, 1] },
    { id: b3, group: "B", pattern: [0, 1, 0, 0, 1, 0, 0] },
  ];

  for (const s of students) {
    const dailyAssignments =
      s.group === "A" ? [quran, dhikr, birr] : [quran, hadith];

    for (let i = 6; i >= 0; i--) {
      const dayIndex = 6 - i;
      const didWell = s.pattern[dayIndex] === 1;
      const date = daysAgo(i);

      // الصلاة (multiple)
      const salahTimes = didWell ? 5 : Math.floor(Math.random() * 4);
      rows.push({
        student_id: s.id,
        assignment_id: salah.id,
        occurred_on: date,
        times_completed: salahTimes,
        points_earned: Math.round((10 * salahTimes) / 5),
        submitted_at: new Date().toISOString(),
      });

      for (const a of dailyAssignments) {
        if (didWell || Math.random() > 0.5) {
          rows.push({
            student_id: s.id,
            assignment_id: a.id,
            occurred_on: date,
            times_completed: 1,
            points_earned: a.points,
            description: a.needs_description ? "ساعدت في أعمال البيت اليوم." : null,
            submitted_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  const { error: rowsError } = await supabase
    .from("completions")
    .upsert(rows, { onConflict: "student_id,assignment_id,occurred_on" });
  if (rowsError) throw rowsError;
  console.log(`✓ تم إدخال ${rows.length} سجل إنجاز`);

  await supabase.from("teacher_notes").insert([
    { student_id: a3, teacher_id: teacher1Id, note: "يحتاج تشجيعًا إضافيًا هذا الأسبوع، تحدثت مع ولي الأمر." },
  ]);

  console.log("\n✅ اكتملت زراعة البيانات التجريبية!");
  console.log("—————————————————————————————");
  console.log("كل الحسابات التجريبية بكلمة المرور:", DEMO_PASSWORD);
  console.log("مسؤول: admin@demo.local");
  console.log("معلم: teacher1@demo.local / teacher2@demo.local");
  console.log("طالب: student.a1@demo.local (وغيره حتى b3)");
}

main().catch((err) => {
  console.error("❌ خطأ:", err.message ?? err);
  process.exit(1);
});
