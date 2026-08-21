import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Group } from "@/lib/supabase/types";

export default async function AdminHomePage() {
  const supabase = await createClient();

  const [{ count: studentsCount }, { count: teachersCount }, { count: groupsCount }, { count: assignmentsCount }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "teacher"),
      supabase.from("groups").select("*", { count: "exact", head: true }),
      supabase.from("assignments").select("*", { count: "exact", head: true }).eq("active", true),
    ]);

  const { data: groupsData } = await supabase.from("groups").select("*");
  const groups = (groupsData ?? []) as Group[];

  const leaderboards = await Promise.all(
    groups.map(async (g) => {
      const { data } = await supabase.rpc("get_group_leaderboard", { p_group_id: g.id });
      return data ?? [];
    })
  );
  const allRows = leaderboards.flat() as { commitment_pct: number; full_name: string; student_id: string }[];
  const avgCommitment = allRows.length
    ? Math.round(allRows.reduce((s, r) => s + r.commitment_pct, 0) / allRows.length)
    : 0;

  const needsAttention = allRows
    .filter((r) => r.commitment_pct < 50)
    .sort((a, b) => a.commitment_pct - b.commitment_pct)
    .slice(0, 6);

  return (
    <div className="space-y-7">
      <h1 className="font-display text-xl font-bold text-ink">نظرة عامة</h1>

      <div className="grid grid-cols-2 gap-3">
        <Stat icon="👦" label="الطلاب" value={studentsCount ?? 0} />
        <Stat icon="👨‍🏫" label="المعلمون" value={teachersCount ?? 0} />
        <Stat icon="⭐" label="المجموعات" value={groupsCount ?? 0} />
        <Stat icon="📋" label="التكاليف النشطة" value={assignmentsCount ?? 0} />
      </div>

      <div className="rounded-2xl bg-primary-soft p-4 text-center">
        <p className="font-display text-2xl font-extrabold text-primary-dark">{avgCommitment}%</p>
        <p className="mt-0.5 text-xs font-medium text-primary-dark/80">متوسط الالتزام هذا الأسبوع</p>
      </div>

      <div>
        <h2 className="mb-2.5 font-display text-base font-bold text-ink">⚠️ طلاب يحتاجون متابعة</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {needsAttention.length === 0 ? (
            <p className="p-5 text-center text-sm text-ink-soft">لا يوجد طلاب أقل من 50% حاليًا 🎉</p>
          ) : (
            needsAttention.map((r, i) => (
              <div
                key={r.student_id}
                className={`flex items-center justify-between px-4 py-3 ${i !== 0 ? "border-t border-border" : ""}`}
              >
                <span className="text-sm font-bold text-ink">{r.full_name}</span>
                <span className="text-sm font-bold text-flame">{r.commitment_pct}%</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-primary/30 bg-primary-soft/50 p-4 text-sm leading-relaxed text-ink">
        <p className="font-bold text-primary-dark">👥 عايز تضيف طالب / معلم / مجموعة جديدة؟</p>
        <p className="mt-1 text-ink-soft">
          ده بيتعمل من لوحة Supabase مباشرة (مجانية وجاهزة، بدون أي كود). خطوات مبسّطة موجودة في ملف README.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <QuickLink href="/admin/assignments" icon="📋" label="التكاليف" />
        <QuickLink href="/admin/leaderboards" icon="🏆" label="لوحات الصدارة" />
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="text-xl">{icon}</div>
      <p className="mt-1 font-display text-xl font-extrabold text-ink">{value}</p>
      <p className="text-xs text-ink-soft">{label}</p>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface p-4 font-bold text-ink"
    >
      <span className="text-xl">{icon}</span> {label}
    </Link>
  );
}
