import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { BottomNav } from "@/components/shared/BottomNav";
import { LogoutButton } from "@/components/shared/LogoutButton";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "teacher") redirect("/");

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 px-5 py-3.5 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <p className="font-display text-base font-bold text-ink">{profile.full_name}</p>
            <p className="text-xs text-ink-soft">لوحة المعلم</p>
          </div>
          <LogoutButton />
        </div>
      </header>
      <div className="mx-auto w-full max-w-2xl px-5 pb-24 pt-5">{children}</div>
      <BottomNav role="teacher" />
    </>
  );
}
