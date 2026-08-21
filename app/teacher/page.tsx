import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Assignment, Group, Profile } from "@/lib/supabase/types";
import { cairoTodayISO } from "@/lib/date";

export default async function TeacherHomePage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const today = cairoTodayISO();

  const { data: groupsData } = await supabase
    .from("groups")
    .select("*")
    .eq("teacher_id", profile!.id);
  const groups = (groupsData ?? []) as Group[];
  const groupIds = groups.map((g) => g.id);

  const { data: studentsData } = groupIds.length
    ? await supabase.from("profiles").select("*").in("group_id", groupIds).eq("role", "student")
    : { data: [] as Profile[] };
  const students = (studentsData ?? []) as Profile[];

  let todaysAssignments: (Assignment & { group_id: string })[] = [];
  if (groupIds.length) {
    const { data } = await supabase
      .from("assignment_groups")
      .select("group_id, assignments(*)")
      .in("group_id", groupIds);

    todaysAssignments = (data ?? [])
      .map((r) => ({ ...(r.assignments as unknown as Assignment), group_id: r.group_id as string }))
      .filter((a) => a.active && (a.type === "daily" || a.type === "multiple"));
  }

  const studentIds = students.map((s) => s.id);
  const { data: todayCompletions } = studentIds.length
    ? await supabase
        .from("completions")
        .select("student_id, assignment_id, times_completed")
        .eq("occurred_on", today)
        .in("student_id", studentIds)
    : { data: [] as { student_id: string; assignment_id: string; times_completed: number }[] };

  const completedMap = new Map<string, number>();
  (todayCompletions ?? []).forEach((c) => completedMap.set(`${c.student_id}:${c.assignment_id}`, c.times_completed));

  const notDoneToday = students.filter((s) => {
    const groupAssignments = todaysAssignments.filter((a) => a.group_id === s.group_id);
    if (groupAssignments.length === 0) return false;
    return groupAssignments.some((a) => {
      const done = completedMap.get(`${s.id}:${a.id}`) ?? 0;
      return done < a.times_required;
    });
  });

  const { data: recentSubmissions } = studentIds.length
    ? await supabase
        .from("completions")
        .select("id, description, submitted_at, student_id, assignment_id")
        .in("student_id", studentIds)
        .not("description", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(6)
    : { data: [] as { id: string; description: string; submitted_at: string; student_id: string; assignment_id: string }[] };

  const studentById = new Map(students.map((s) => [s.id, s.full_name]));
  const assignmentById = new Map(todaysAssignments.map((a) => [a.id, a.title]));

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">مجموعاتي</h1>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {groups.map((g) => (
            <div key={g.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="text-2xl">{g.emoji}</div>
              <p className="mt-1 font-bold text-ink">{g.name}</p>
              <p className="text-xs text-ink-soft">
                {students.filter((s) => s.group_id === g.id).length} طالب
              </p>
            </div>
          ))}
          {groups.length === 0 && (
            <p className="col-span-2 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-ink-soft">
              لم يتم تعيينك كمعلم لأي مجموعة بعد. تواصل مع المسؤول.
            </p>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-display text-base font-bold text-ink">
          ⏳ لم يُنجزوا تكاليف اليوم بعد ({notDoneToday.length})
        </h2>
        <div className="mt-2.5 overflow-hidden rounded-2xl border border-border bg-surface">
          {notDoneToday.length === 0 ? (
            <p className="p-5 text-center text-sm text-ink-soft">
              الجميع أنجزوا تكاليف اليوم حتى الآن 🎉
            </p>
          ) : (
            notDoneToday.map((s, i) => (
              <div
                key={s.id}
                className={`flex items-center justify-between px-4 py-3 ${i !== 0 ? "border-t border-border" : ""}`}
              >
                <span className="text-sm font-bold text-ink">{s.full_name}</span>
                <span className="text-xs text-ink-soft">
                  {groups.find((g) => g.id === s.group_id)?.emoji}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-ink">✍️ آخر الإجابات المكتوبة</h2>
          <Link href="/teacher/reviews" className="text-xs font-bold text-primary">
            عرض الكل
          </Link>
        </div>
        <div className="mt-2.5 space-y-2">
          {(recentSubmissions ?? []).length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-ink-soft">
              لا توجد إجابات بعد
            </p>
          )}
          {(recentSubmissions ?? []).map((sub) => (
            <div key={sub.id} className="rounded-2xl border border-border bg-surface p-3.5">
              <p className="text-xs font-bold text-primary-dark">
                {studentById.get(sub.student_id)} · {assignmentById.get(sub.assignment_id) ?? "—"}
              </p>
              <p className="mt-1 text-sm text-ink">{sub.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
