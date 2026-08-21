"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AddNoteForm({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("teacher_notes").insert({
      student_id: studentId,
      teacher_id: user!.id,
      note: note.trim(),
    });

    setSaving(false);
    if (!error) {
      setNote("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="أضف ملاحظة..."
        className="flex-1 rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <button
        type="submit"
        disabled={saving || !note.trim()}
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        إضافة
      </button>
    </form>
  );
}
