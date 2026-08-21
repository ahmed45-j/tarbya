import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Assignment } from "@/lib/supabase/types";

const TYPE_LABEL: Record<Assignment["type"], string> = {
  daily: "يومي",
  weekly: "أسبوعي",
  multiple: "عدة مرات/يوم",
};

export default async function TeacherAssignmentsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("assignments")
    .select("*")
    .eq("created_by", profile!.id)
    .order("created_at", { ascending: false });

  const assignments = (data ?? []) as Assignment[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-ink">📋 تكاليفي</h1>
        <Link
          href="/teacher/assignments/new"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
        >
          + تكليف جديد
        </Link>
      </div>

      <div className="space-y-2.5">
        {assignments.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-ink-soft">
            لم تُنشئ أي تكليف بعد
          </p>
        )}
        {assignments.map((a) => (
          <Link
            key={a.id}
            href={`/teacher/assignments/${a.id}`}
            className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4"
          >
            <div>
              <p className="font-bold text-ink">
                {a.title} {!a.active && <span className="text-xs text-ink-soft">(غير مُفعّل)</span>}
              </p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {TYPE_LABEL[a.type]} · {a.points} نقطة
                {a.type === "multiple" ? ` · ${a.times_required} مرات` : ""}
              </p>
            </div>
            <span className="text-ink-soft">‹</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
