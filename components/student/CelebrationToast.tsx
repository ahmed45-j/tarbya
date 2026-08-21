"use client";

import { useEffect } from "react";

interface CelebrationData {
  points: number;
  message: string | null;
  emoji?: string;
}

export function CelebrationToast({
  data,
  onDone,
}: {
  data: CelebrationData | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!data) return;

    let cancelled = false;
    // تحميل مكتبة confetti بشكل كسول (lazy) حتى لا تُحمَّل إلا عند أول إنجاز فعلي
    import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      confetti({
        particleCount: 60,
        spread: 65,
        startVelocity: 32,
        gravity: 1.1,
        ticks: 110,
        origin: { y: 0.7 },
        colors: ["#0f7a54", "#f2a63d", "#ef6c4d"],
        scalar: 0.9,
      });
    });

    const t = setTimeout(onDone, 2600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [data, onDone]);

  if (!data) return null;

  return (
    <div
      className="fixed inset-x-4 top-6 z-50 mx-auto max-w-sm animate-pop-in rounded-2xl border border-gold/40 bg-surface p-4 text-center shadow-lg"
      role="status"
      onClick={onDone}
    >
      <div className="text-3xl">{data.emoji ?? "🎉"}</div>
      <p className="mt-1 font-display text-lg font-bold text-ink">أحسنت!</p>
      <p className="mt-0.5 font-display text-base font-bold text-gold">+{data.points} ⭐</p>
      {data.message && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{data.message}</p>}
    </div>
  );
}
