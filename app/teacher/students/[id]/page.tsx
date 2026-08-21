import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Group, Profile } from "@/lib/supabase/types";
import { AddNoteForm } from "@/components/teacher/AddNoteForm";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (!student) notFound();

  const s = student as Profile;

  const { data: groupData } = s.group_id
    ? await supabase.from("groups").select("*").eq("id", s.group_id).single()
    : { data: null };
  const group = groupData as Group | null;

  const { data: leaderboard } = s.group_id
    ? await supabase.rpc("get_group_leaderboard", { p_group_id: s.group_id })
    : { data: null };
  const myRow = (leaderboard ?? []).find((r: { student_id: string }) => r.student_id === s.id);

  const { data: recentCompletions } = await supabase
    .from("completions")
    .select("id, occurred_on, times_completed, description, assignment_id, assignments(title)")
    .eq("student_id", s.id)
    .order("occurred_on", { ascending: false })
    .limit(15);

  const { data: notes } = await supabase
    .from("teacher_notes")
    .select("*")
    .eq("student_id", s.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">{s.full_name}</h1>
        <p className="text-sm text-ink-soft">
          {group ? `${group.emoji} ${group.name}` : "بدون مجموعة"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <MiniStat label="نقاط الأسبوع" value={String(myRow?.points_this_week ?? 0)} />
        <MiniStat label="الالتزام" value={`${myRow?.commitment_pct ?? 0}%`} />
        <MiniStat label="السلسلة" value={`🔥 ${myRow?.streak ?? 0}`} />
      </div>

      <div>
        <h2 className="mb-2.5 font-display text-base font-bold text-ink">آخر الإنجازات</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {(recentCompletions ?? []).length === 0 ? (
            <p className="p-5 text-center text-sm text-ink-soft">لا يوجد سجل بعد</p>
          ) : (
            (recentCompletions ?? []).map((c, i: number) => (
              <div key={c.id} className={`px-4 py-3 ${i !== 0 ? "border-t border-border" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-ink">
                    {(c.assignments as unknown as { title: string } | null)?.title}
                  </span>
                  <span className="text-xs text-ink-soft">{c.occurred_on}</span>
                </div>
                {c.description && <p className="mt-1 text-xs text-ink-soft">{c.description}</p>}
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-2.5 font-display text-base font-bold text-ink">ملاحظاتي على الطالب</h2>
        <AddNoteForm studentId={s.id} />
        <div className="mt-3 space-y-2">
          {(notes ?? []).map((n) => (
            <div key={n.id} className="rounded-xl bg-primary-soft/60 px-3.5 py-2.5 text-sm text-ink">
              {n.note}
              <p className="mt-1 text-[11px] text-ink-soft">
                {new Date(n.created_at).toLocaleDateString("ar-EG")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-primary-soft p-3 text-center">
      <p className="font-display text-base font-extrabold text-primary-dark">{value}</p>
      <p className="mt-0.5 text-[11px] text-ink-soft">{label}</p>
    </div>
  );
}
