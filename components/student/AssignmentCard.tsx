"use client";

import { useState } from "react";
import type { Assignment } from "@/lib/supabase/types";
import { DayArcTracker } from "./DayArcTracker";

const TYPE_ICON: Record<Assignment["type"], string> = {
  daily: "📖",
  weekly: "🗓️",
  multiple: "🕌",
};

export interface CardCompletionState {
  timesCompleted: number;
  description: string | null;
}

export function AssignmentCard({
  assignment,
  state,
  onComplete,
}: {
  assignment: Assignment;
  state: CardCompletionState;
  onComplete: (delta: number, description?: string) => Promise<boolean>;
}) {
  const [showDescriptionBox, setShowDescriptionBox] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isDone = state.timesCompleted >= assignment.times_required;
  const icon = TYPE_ICON[assignment.type];

  async function handleSimpleTap() {
    setSubmitting(true);
    await onComplete(1);
    setSubmitting(false);
  }

  async function handleDescriptionSubmit() {
    if (!text.trim()) return;
    setSubmitting(true);
    const ok = await onComplete(1, text.trim());
    setSubmitting(false);
    if (ok) setShowDescriptionBox(false);
  }

  async function handleTick() {
    if (submitting || isDone) return;
    setSubmitting(true);
    await onComplete(1);
    setSubmitting(false);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 animate-rise">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="text-xl leading-none">{icon}</span>
          <div>
            <h3 className="font-bold text-ink leading-tight">{assignment.title}</h3>
            {assignment.description && (
              <p className="mt-0.5 text-xs text-ink-soft leading-relaxed">{assignment.description}</p>
            )}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-gold-soft px-2.5 py-1 text-xs font-bold text-gold">
          {assignment.points} ⭐
        </span>
      </div>

      <div className="mt-3">
        {assignment.type === "multiple" ? (
          <DayArcTracker
            timesRequired={assignment.times_required}
            timesCompleted={state.timesCompleted}
            title={assignment.title}
            disabled={submitting}
            onTick={handleTick}
          />
        ) : assignment.needs_description ? (
          isDone ? (
            <div className="rounded-xl bg-primary-soft px-3 py-2.5 text-sm text-primary-dark">
              <span className="font-bold">✅ تم الإرسال: </span>
              {state.description}
            </div>
          ) : showDescriptionBox ? (
            <div className="space-y-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="اكتب لنا ماذا فعلت اليوم؟"
                rows={3}
                className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={handleDescriptionSubmit}
                disabled={submitting || !text.trim()}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? "جارٍ الإرسال..." : "إرسال"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDescriptionBox(true)}
              className="w-full rounded-xl border-2 border-dashed border-primary/40 bg-primary-soft py-2.5 text-sm font-bold text-primary-dark transition active:scale-[0.98]"
            >
              ماذا فعلت؟ ✍️
            </button>
          )
        ) : (
          <button
            onClick={handleSimpleTap}
            disabled={isDone || submitting}
            className={`w-full rounded-xl py-2.5 text-sm font-bold transition active:scale-[0.98] ${
              isDone
                ? "bg-primary-soft text-primary-dark"
                : "bg-primary text-white disabled:opacity-60"
            }`}
          >
            {isDone ? "تم ✅" : submitting ? "جارٍ الحفظ..." : "أنجزت"}
          </button>
        )}
      </div>
    </div>
  );
}
