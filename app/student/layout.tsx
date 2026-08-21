import { BottomNav } from "@/components/shared/BottomNav";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNav role="student" />
    </>
  );
}
