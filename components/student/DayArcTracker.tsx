"use client";

const DEFAULT_PRAYER_LABELS = ["الفجر", "الظهر", "العصر", "المغرب", "العشاء"];

export function DayArcTracker({
  timesRequired,
  timesCompleted,
  title,
  disabled,
  onTick,
}: {
  timesRequired: number;
  timesCompleted: number;
  title: string;
  disabled?: boolean;
  onTick: () => void;
}) {
  const isPrayer = timesRequired === 5 && title.includes("صلا");
  const labels = isPrayer ? DEFAULT_PRAYER_LABELS : null;
  const nextIndex = timesCompleted; // أول خانة غير مكتملة

  return (
    <div className="rounded-2xl bg-gradient-to-l from-primary-soft via-gold-soft to-primary-soft p-3">
      <div className="flex items-center justify-between gap-1" dir="ltr">
        {Array.from({ length: timesRequired }).map((_, i) => {
          const done = i < timesCompleted;
          const isNext = i === nextIndex && !disabled;
          return (
            <button
              key={i}
              type="button"
              disabled={!isNext}
              onClick={onTick}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 transition ${
                isNext ? "active:scale-95" : ""
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition ${
                  done
                    ? "bg-gold text-white shadow-sm"
                    : isNext
                    ? "border-2 border-dashed border-primary bg-white text-primary"
                    : "border-2 border-border bg-white/60 text-ink-soft/50"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              {labels && (
                <span className={`text-[11px] font-medium ${done ? "text-ink" : "text-ink-soft"}`}>
                  {labels[i]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
