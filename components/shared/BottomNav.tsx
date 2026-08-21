"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV: Record<"student" | "teacher" | "admin", NavItem[]> = {
  student: [
    { href: "/student", label: "اليوم", icon: "🏠" },
    { href: "/student/leaderboard", label: "الترتيب", icon: "🏆" },
    { href: "/student/history", label: "سجلي", icon: "📊" },
  ],
  teacher: [
    { href: "/teacher", label: "الرئيسية", icon: "🏠" },
    { href: "/teacher/students", label: "طلابي", icon: "👥" },
    { href: "/teacher/assignments", label: "التكاليف", icon: "📋" },
    { href: "/teacher/reviews", label: "المراجعات", icon: "✍️" },
  ],
  admin: [
    { href: "/admin", label: "الرئيسية", icon: "🏠" },
    { href: "/admin/assignments", label: "التكاليف", icon: "📋" },
    { href: "/admin/leaderboards", label: "لوحات الصدارة", icon: "🏆" },
  ],
};

export function BottomNav({ role }: { role: "student" | "teacher" | "admin" }) {
  const pathname = usePathname();
  const items = NAV[role];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-bold transition ${
                active ? "text-primary" : "text-ink-soft"
              }`}
            >
              <span className={`text-xl transition ${active ? "scale-110" : ""}`}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
