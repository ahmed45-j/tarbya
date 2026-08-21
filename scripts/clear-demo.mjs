// حذف كل الحسابات التجريبية (@demo.local) وبياناتها المرتبطة تلقائيًا
// التشغيل: node --env-file=.env.local scripts/clear-demo.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("❌ تأكد من وجود NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const { data: usersList, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;

  const demoUsers = usersList.users.filter((u) => u.email?.endsWith("@demo.local"));
  console.log(`سيتم حذف ${demoUsers.length} حساب تجريبي...`);

  for (const u of demoUsers) {
    await supabase.auth.admin.deleteUser(u.id);
    console.log(`✓ تم حذف ${u.email}`);
  }

  await supabase.from("groups").delete().in("name", ["مجموعة النجوم", "مجموعة الأبطال"]);

  console.log("✅ تم تنظيف كل البيانات التجريبية.");
}

main().catch((err) => {
  console.error("❌ خطأ:", err.message ?? err);
  process.exit(1);
});
