import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Assignment } from "@/lib/supabase/types";
import { cairoTodayISO } from "@/lib/date";

function lastNDays(n: number, todayISO: string) {
  const [y, m, d] = todayISO.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  const days: string[] = [];
  for (let i = 0; i < n; i++) {
    const dt = new Date(base);
    dt.setUTCDate(base.getUTCDate() - i);
    days.push(dt.toISOString().slice(0, 10));
  }
  return days;
}

const WEEKDAY_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default async function StudentHistoryPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "student") redirect("/");

  const supabase = await createClient();

  let assignments: Assignment[] = [];
  if (profile.group_id) {
    const { data } = await supabase
      .from("assignment_groups")
      .select("assignments(*)")
      .eq("group_id", profile.group_id);
    assignments = (data ?? [])
      .map((r) => r.assignments as unknown as Assignment)
      .filter((a): a is Assignment => !!a && a.active && (a.type === "daily" || a.type === "multiple"));
  }

  const today = cairoTodayISO();
  const days = lastNDays(14, today);
  const oldest = days[days.length - 1];

  const { data: rows } = await supabase
    .from("completions")
    .select("assignment_id, occurred_on, times_completed")
    .eq("student_id", profile.id)
    .gte("occurred_on", oldest);

  const byDay: Record<string, Record<string, number>> = {};
  (rows ?? []).forEach((r) => {
    byDay[r.occurred_on] ??= {};
    byDay[r.occurred_on][r.assignment_id] = r.times_completed;
  });

  const dailyPct = days.map((day) => {
    const applicable = assignments.filter((a) => a.created_at.slice(0, 10) <= day);
    if (applicable.length === 0) return { day, pct: null as number | null };

    let required = 0;
    let done = 0;
    applicable.forEach((a) => {
      required += a.times_required;
      done += Math.min(byDay[day]?.[a.id] ?? 0, a.times_required);
    });

    return { day, pct: required > 0 ? Math.round((done / required) * 100) : null };
  });

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-24 pt-6">
      <h1 className="font-display text-xl font-bold text-ink">📊 سجلي</h1>
      <p className="mt-1 text-sm text-ink-soft">نسبة التزامك في آخر 14 يومًا</p>

      <div className="mt-4 space-y-2">
        {dailyPct.map(({ day, pct }) => {
          const weekday = WEEKDAY_AR[new Date(day + "T00:00:00Z").getUTCDay()];
          const isToday = day === today;
          return (
            <div
              key={day}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5"
            >
              <div className="w-16 shrink-0">
                <p className="text-xs font-bold text-ink">{weekday}</p>
                <p className="text-[11px] text-ink-soft">{day.slice(5)}{isToday ? " (اليوم)" : ""}</p>
              </div>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg">
                {pct !== null && (
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                )}
              </div>
              <span className="w-10 shrink-0 text-left text-xs font-bold text-ink-soft">
                {pct !== null ? `${pct}%` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
