import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Group, LeaderboardRow } from "@/lib/supabase/types";

export default async function TeacherStudentsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: groupsData } = await supabase.from("groups").select("*").eq("teacher_id", profile!.id);
  const groups = (groupsData ?? []) as Group[];

  const leaderboards = await Promise.all(
    groups.map(async (g) => {
      const { data } = await supabase.rpc("get_group_leaderboard", { p_group_id: g.id });
      return { group: g, rows: (data as LeaderboardRow[] | null) ?? [] };
    })
  );

  return (
    <div className="space-y-7">
      <h1 className="font-display text-xl font-bold text-ink">👥 طلابي</h1>

      {leaderboards.map(({ group, rows }) => (
        <div key={group.id}>
          <h2 className="mb-2.5 flex items-center gap-1.5 font-display text-base font-bold text-ink">
            <span>{group.emoji}</span> {group.name}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {rows.length === 0 ? (
              <p className="p-5 text-center text-sm text-ink-soft">لا يوجد طلاب في هذه المجموعة بعد</p>
            ) : (
              rows.map((row, i) => (
                <Link
                  key={row.student_id}
                  href={`/teacher/students/${row.student_id}`}
                  className={`flex items-center justify-between px-4 py-3.5 ${i !== 0 ? "border-t border-border" : ""}`}
                >
                  <div>
                    <p className="text-sm font-bold text-ink">{row.full_name}</p>
                    <p className="text-xs text-ink-soft">
                      {row.points_this_week} نقطة · 🔥 {row.streak} يوم
                    </p>
                  </div>
                  <span className="font-display text-base font-bold text-primary-dark">
                    {row.commitment_pct}%
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
