"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EncouragementMessage } from "@/lib/supabase/types";

export function MessagesManager({
  assignmentId,
  initialMessages,
}: {
  assignmentId: string;
  initialMessages: EncouragementMessage[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("encouragement_messages")
      .insert({ assignment_id: assignmentId, message: newMessage.trim(), created_by: user!.id })
      .select()
      .single();

    setSaving(false);
    if (!error && data) {
      setMessages((prev) => [...prev, data as EncouragementMessage]);
      setNewMessage("");
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("encouragement_messages").delete().eq("id", id);
    if (!error) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      router.refresh();
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs text-ink-soft">
        تُختار رسالة عشوائيًا من هذه القائمة عند إنجاز الطالب للتكليف.
      </p>
      <div className="space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5"
          >
            <p className="text-sm text-ink leading-relaxed">{m.message}</p>
            <button
              onClick={() => handleDelete(m.id)}
              className="shrink-0 text-xs font-bold text-flame"
            >
              حذف
            </button>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-ink-soft">
            لا توجد رسائل تشجيع بعد
          </p>
        )}
      </div>

      <form onSubmit={handleAdd} className="mt-3 flex gap-2">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="أضف رسالة تشجيع جديدة..."
          className="flex-1 rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          disabled={saving || !newMessage.trim()}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          إضافة
        </button>
      </form>
    </div>
  );
}
