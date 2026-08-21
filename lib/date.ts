const TZ = "Africa/Cairo";

// يُطابق توقيت قاعدة البيانات (انظر schema.sql: alter database ... set timezone)
export function cairoTodayISO(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

// بداية الأسبوع (الاثنين) — يطابق date_trunc('week', ...) في Postgres
export function cairoWeekStartISO(): string {
  const [y, m, d] = cairoTodayISO().split("-").map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d));
  const day = utcDate.getUTCDay(); // 0=Sunday..6=Saturday
  const diffToMonday = day === 0 ? 6 : day - 1;
  utcDate.setUTCDate(utcDate.getUTCDate() - diffToMonday);
  return utcDate.toISOString().slice(0, 10);
}
