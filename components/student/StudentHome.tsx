"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Assignment, LeaderboardRow } from "@/lib/supabase/types";
import { AssignmentCard, type CardCompletionState } from "./AssignmentCard";
import { CelebrationToast } from "./CelebrationToast";
import { LogoutButton } from "@/components/shared/LogoutButton";

export interface StudentHomeProps {
  fullName: string;
  group: { id: string; name: string; emoji: string } | null;
  assignments: Assignment[];
  initialCompletions: Record<string, CardCompletionState>;
  leaderboard: LeaderboardRow[];
  myId: string;
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

export function StudentHome({
  fullName,
  group,
  assignments,
  initialCompletions,
  leaderboard,
  myId,
}: StudentHomeProps) {
  const [completions, setCompletions] = useState(initialCompletions);
  const [celebration, setCelebration] = useState<{ points: number; message: string | null } | null>(
    null
  );

  const myRankIndex = leaderboard.findIndex((r) => r.student_id === myId);
  const me = myRankIndex >= 0 ? leaderboard[myRankIndex] : null;
  const nextAbove = myRankIndex > 0 ? leaderboard[myRankIndex - 1] : null;

  const pointsGap = useMemo(() => {
    if (!me || !nextAbove) return null;
    return Math.max(0, nextAbove.points_this_week - me.points_this_week);
  }, [me, nextAbove]);

  async function handleComplete(assignment: Assignment, delta: number, description?: string) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("record_completion", {
      p_assignment_id: assignment.id,
      p_delta: delta,
      p_description: description ?? null,
    });

    if (error || !data) {
      alert("حدث خطأ أثناء الحفظ، حاول مرة أخرى");
      return false;
    }

    setCompletions((prev) => ({
      ...prev,
      [assignment.id]: {
        timesCompleted: data.times_completed,
        description: data.completion?.description ?? description ?? null,
      },
    }));

    setCelebration({ points: data.points_earned, message: data.message });
    return true;
  }

  const firstName = fullName.split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-md pb-24">
      <CelebrationToast data={celebration} onDone={() => setCelebration(null)} />

      {/* الترويسة */}
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-bold text-ink">
            السلام عليكم يا {firstName} 👋
          </h1>
          <LogoutButton />
        </div>
        {group && (
          <p className="mt-1 text-sm text-ink-soft">
            {group.emoji} {group.name}
          </p>
        )}
      </header>

      {/* الإحصائيات */}
      <div className="grid grid-cols-3 gap-2.5 px-5">
        <StatCard icon="🔥" label="سلسلة الالتزام" value={`${me?.streak ?? 0} يوم`} tone="flame" />
        <StatCard icon="⭐" label="نقاطك هذا الأسبوع" value={`${me?.points_this_week ?? 0}`} tone="gold" />
        <StatCard
          icon="🏆"
          label="ترتيبك"
          value={myRankIndex >= 0 ? `#${myRankIndex + 1}` : "—"}
          tone="primary"
        />
      </div>

      {pointsGap !== null && pointsGap > 0 && (
        <p className="mx-5 mt-3 rounded-xl bg-gold-soft px-3.5 py-2.5 text-center text-sm font-bold text-gold">
          باقي لك {pointsGap} نقطة لتقترب من المركز {myRankIndex}! 🚀
        </p>
      )}
      {myRankIndex === 0 && leaderboard.length > 1 && (
        <p className="mx-5 mt-3 rounded-xl bg-primary-soft px-3.5 py-2.5 text-center text-sm font-bold text-primary-dark">
          أنت في المركز الأول هذا الأسبوع، استمر! 🌟
        </p>
      )}

      {/* تكاليف اليوم */}
      <section className="mt-6 px-5">
        <h2 className="mb-3 font-display text-base font-bold text-ink">تكاليف اليوم</h2>
        {assignments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-ink-soft">
            لا توجد تكاليف مضافة لمجموعتك بعد
          </p>
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                state={completions[a.id] ?? { timesCompleted: 0, description: null }}
                onComplete={(delta, description) => handleComplete(a, delta, description)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ترتيب المجموعة */}
      {leaderboard.length > 0 && (
        <section className="mt-7 px-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base font-bold text-ink">🏆 ترتيب مجموعتك</h2>
            <Link href="/student/leaderboard" className="text-xs font-bold text-primary">
              عرض الكل
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {leaderboard.slice(0, 5).map((row, i) => (
              <div
                key={row.student_id}
                className={`flex items-center justify-between px-4 py-3 ${
                  i !== 0 ? "border-t border-border" : ""
                } ${row.student_id === myId ? "bg-primary-soft/60" : ""}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 text-center text-sm">{RANK_MEDALS[i] ?? i + 1}</span>
                  <span className="text-sm font-bold text-ink">
                    {row.full_name}
                    {row.student_id === myId && <span className="text-primary"> ← أنت</span>}
                  </span>
                </div>
                <span className="text-sm font-bold text-ink-soft">{row.commitment_pct}%</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  tone: "flame" | "gold" | "primary";
}) {
  const toneClasses = {
    flame: "bg-flame-soft text-flame",
    gold: "bg-gold-soft text-gold",
    primary: "bg-primary-soft text-primary-dark",
  }[tone];

  return (
    <div className={`rounded-2xl p-3 text-center ${toneClasses}`}>
      <div className="text-lg">{icon}</div>
      <div className="mt-0.5 font-display text-base font-extrabold">{value}</div>
      <div className="mt-0.5 text-[11px] font-medium opacity-80 leading-tight">{label}</div>
    </div>
  );
}
