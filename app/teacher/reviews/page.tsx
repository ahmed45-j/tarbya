import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Group, Profile } from "@/lib/supabase/types";

export default async function TeacherReviewsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: groupsData } = await supabase.from("groups").select("*").eq("teacher_id", profile!.id);
  const groups = (groupsData ?? []) as Group[];
  const groupIds = groups.map((g) => g.id);

  const { data: studentsData } = groupIds.length
    ? await supabase.from("profiles").select("*").in("group_id", groupIds).eq("role", "student")
    : { data: [] as Profile[] };
  const students = (studentsData ?? []) as Profile[];
  const studentById = new Map(students.map((s) => [s.id, s]));

  const { data: submissions } = students.length
    ? await supabase
        .from("completions")
        .select("id, description, submitted_at, occurred_on, student_id, assignments(title)")
        .in(
          "student_id",
          students.map((s) => s.id)
        )
        .not("description", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(50)
    : { data: [] };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold text-ink">✍️ مراجعة الإجابات</h1>

      <div className="space-y-2.5">
        {(submissions ?? []).length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-ink-soft">
            لا توجد إجابات مكتوبة بعد
          </p>
        )}
        {(submissions ?? []).map((sub) => {
          const student = studentById.get(sub.student_id);
          return (
            <div key={sub.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-ink">{student?.full_name}</p>
                <p className="text-xs text-ink-soft">{sub.occurred_on}</p>
              </div>
              <p className="mt-0.5 text-xs font-bold text-primary-dark">
                {(sub.assignments as unknown as { title: string } | null)?.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink">{sub.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
