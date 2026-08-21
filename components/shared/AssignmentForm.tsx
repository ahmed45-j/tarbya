"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Assignment, AssignmentType } from "@/lib/supabase/types";

interface GroupOption {
  id: string;
  name: string;
  emoji: string;
}

export function AssignmentForm({
  mode,
  assignment,
  selectedGroupIds = [],
  availableGroups,
  redirectTo,
}: {
  mode: "create" | "edit";
  assignment?: Assignment;
  selectedGroupIds?: string[];
  availableGroups: GroupOption[];
  redirectTo: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(assignment?.title ?? "");
  const [description, setDescription] = useState(assignment?.description ?? "");
  const [type, setType] = useState<AssignmentType>(assignment?.type ?? "daily");
  const [points, setPoints] = useState(assignment?.points ?? 10);
  const [timesRequired, setTimesRequired] = useState(assignment?.times_required ?? 5);
  const [needsDescription, setNeedsDescription] = useState(assignment?.needs_description ?? false);
  const [active, setActive] = useState(assignment?.active ?? true);
  const [groups, setGroups] = useState<string[]>(selectedGroupIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleGroup(id: string) {
    setGroups((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("اكتب اسم التكليف");
      return;
    }
    if (groups.length === 0) {
      setError("اختر مجموعة واحدة على الأقل");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      type,
      points,
      times_required: type === "multiple" ? timesRequired : 1,
      needs_description: needsDescription,
      active,
    };

    let assignmentId = assignment?.id;

    if (mode === "create") {
      const { data, error: insertError } = await supabase
        .from("assignments")
        .insert({ ...payload, created_by: user!.id })
        .select()
        .single();

      if (insertError || !data) {
        setError("تعذّر إنشاء التكليف");
        setSaving(false);
        return;
      }
      assignmentId = data.id;
    } else {
      const { error: updateError } = await supabase
        .from("assignments")
        .update(payload)
        .eq("id", assignmentId!);

      if (updateError) {
        setError("تعذّر حفظ التعديلات");
        setSaving(false);
        return;
      }

      // إعادة مزامنة روابط المجموعات: احذف ما أُلغي، أضف ما هو جديد
      const toRemove = selectedGroupIds.filter((id) => !groups.includes(id));
      const toAdd = groups.filter((id) => !selectedGroupIds.includes(id));

      if (toRemove.length) {
        await supabase
          .from("assignment_groups")
          .delete()
          .eq("assignment_id", assignmentId!)
          .in("group_id", toRemove);
      }
      if (toAdd.length) {
        await supabase
          .from("assignment_groups")
          .insert(toAdd.map((group_id) => ({ assignment_id: assignmentId!, group_id })));
      }
      router.push(redirectTo);
      router.refresh();
      return;
    }

    // ربط المجموعات عند الإنشاء
    if (groups.length) {
      await supabase
        .from("assignment_groups")
        .insert(groups.map((group_id) => ({ assignment_id: assignmentId!, group_id })));
    }

    router.push(`${redirectTo}/${assignmentId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="اسم التكليف">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
          placeholder="مثال: ورد القرآن"
        />
      </Field>

      <Field label="الوصف (اختياري)">
        <textarea
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="input"
        />
      </Field>

      <Field label="نوع التكرار">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["daily", "يومي"],
              ["weekly", "أسبوعي"],
              ["multiple", "عدة مرات/يوم"],
            ] as [AssignmentType, string][]
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setType(value)}
              className={`rounded-xl border-2 py-2.5 text-sm font-bold transition ${
                type === value
                  ? "border-primary bg-primary-soft text-primary-dark"
                  : "border-border bg-surface text-ink-soft"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      {type === "multiple" && (
        <Field label="عدد المرات المطلوبة يوميًا">
          <input
            type="number"
            min={2}
            max={12}
            value={timesRequired}
            onChange={(e) => setTimesRequired(Number(e.target.value))}
            className="input"
          />
        </Field>
      )}

      <Field label="عدد النقاط">
        <input
          type="number"
          min={0}
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
          className="input"
        />
      </Field>

      <label className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3">
        <input
          type="checkbox"
          checked={needsDescription}
          onChange={(e) => setNeedsDescription(e.target.checked)}
          className="h-5 w-5 accent-primary"
        />
        <span className="text-sm font-bold text-ink">يحتاج الطالب إلى كتابة وصف عند الإنجاز</span>
      </label>

      <label className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-5 w-5 accent-primary"
        />
        <span className="text-sm font-bold text-ink">التكليف مُفعّل ويظهر للطلاب</span>
      </label>

      <Field label="المجموعات المستهدفة">
        <div className="space-y-2">
          {availableGroups.length === 0 && (
            <p className="text-sm text-ink-soft">لا توجد مجموعات متاحة</p>
          )}
          {availableGroups.map((g) => (
            <label
              key={g.id}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3"
            >
              <input
                type="checkbox"
                checked={groups.includes(g.id)}
                onChange={() => toggleGroup(g.id)}
                className="h-5 w-5 accent-primary"
              />
              <span className="text-sm font-bold text-ink">
                {g.emoji} {g.name}
              </span>
            </label>
          ))}
        </div>
      </Field>

      {error && (
        <p className="rounded-xl bg-flame-soft px-4 py-2.5 text-sm font-medium text-flame">{error}</p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-primary py-3.5 text-base font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
      >
        {saving ? "جارٍ الحفظ..." : mode === "create" ? "إنشاء التكليف" : "حفظ التعديلات"}
      </button>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid var(--color-border);
          background: var(--color-bg);
          padding: 0.65rem 0.9rem;
          font-size: 0.95rem;
          outline: none;
        }
        .input:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-primary-soft);
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold text-ink">{label}</label>
      {children}
    </div>
  );
}
