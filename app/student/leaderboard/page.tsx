import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { LeaderboardRow, Group } from "@/lib/supabase/types";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function StudentLeaderboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "student") redirect("/");

  const supabase = await createClient();

  let group: Group | null = null;
  let leaderboard: LeaderboardRow[] = [];

  if (profile.group_id) {
    const { data: g } = await supabase.from("groups").select("*").eq("id", profile.group_id).single();
    group = g as Group | null;

    const { data } = await supabase.rpc("get_group_leaderboard", { p_group_id: profile.group_id });
    leaderboard = (data as LeaderboardRow[] | null) ?? [];
  }

  const myIndex = leaderboard.findIndex((r) => r.student_id === profile.id);

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-24 pt-6">
      <h1 className="font-display text-xl font-bold text-ink">🏆 أبطال الأسبوع</h1>
      {group && (
        <p className="mt-1 text-sm text-ink-soft">
          {group.emoji} {group.name}
        </p>
      )}

      {myIndex >= 0 && (
        <p className="mt-4 rounded-xl bg-primary-soft px-4 py-2.5 text-center text-sm font-bold text-primary-dark">
          أنت الآن في المركز {myIndex + 1}
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
        {leaderboard.length === 0 ? (
          <p className="p-6 text-center text-sm text-ink-soft">لا توجد بيانات كافية بعد هذا الأسبوع</p>
        ) : (
          leaderboard.map((row, i) => (
            <div
              key={row.student_id}
              className={`flex items-center justify-between px-4 py-3.5 ${
                i !== 0 ? "border-t border-border" : ""
              } ${row.student_id === profile.id ? "bg-primary-soft/60" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 text-center text-base">{MEDALS[i] ?? i + 1}</span>
                <div>
                  <p className="text-sm font-bold text-ink">
                    {row.full_name}
                    {row.student_id === profile.id && <span className="text-primary"> ← أنت</span>}
                  </p>
                  <p className="text-xs text-ink-soft">{row.points_this_week} نقطة · 🔥 {row.streak}</p>
                </div>
              </div>
              <span className="font-display text-base font-bold text-primary-dark">
                {row.commitment_pct}%
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
