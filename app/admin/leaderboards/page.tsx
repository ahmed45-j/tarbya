import { createClient } from "@/lib/supabase/server";
import type { Group, LeaderboardRow } from "@/lib/supabase/types";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function AdminLeaderboardsPage() {
  const supabase = await createClient();
  const { data: groupsData } = await supabase.from("groups").select("*");
  const groups = (groupsData ?? []) as Group[];

  const leaderboards = await Promise.all(
    groups.map(async (g) => {
      const { data } = await supabase.rpc("get_group_leaderboard", { p_group_id: g.id });
      return { group: g, rows: (data as LeaderboardRow[] | null) ?? [] };
    })
  );

  return (
    <div className="space-y-7">
      <h1 className="font-display text-xl font-bold text-ink">🏆 لوحات الصدارة</h1>

      {leaderboards.map(({ group, rows }) => (
        <div key={group.id}>
          <h2 className="mb-2.5 flex items-center gap-1.5 font-display text-base font-bold text-ink">
            <span>{group.emoji}</span> {group.name}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {rows.length === 0 ? (
              <p className="p-5 text-center text-sm text-ink-soft">لا توجد بيانات بعد</p>
            ) : (
              rows.map((row, i) => (
                <div
                  key={row.student_id}
                  className={`flex items-center justify-between px-4 py-3 ${i !== 0 ? "border-t border-border" : ""}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 text-center text-sm">{MEDALS[i] ?? i + 1}</span>
                    <span className="text-sm font-bold text-ink">{row.full_name}</span>
                  </div>
                  <span className="text-sm font-bold text-ink-soft">{row.commitment_pct}%</span>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
