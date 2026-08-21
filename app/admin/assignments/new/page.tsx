import { createClient } from "@/lib/supabase/server";
import type { Group } from "@/lib/supabase/types";
import { AssignmentForm } from "@/components/shared/AssignmentForm";

export default async function NewAdminAssignmentPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("groups").select("*");
  const groups = (data ?? []) as Group[];

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold text-ink">تكليف جديد</h1>
      <AssignmentForm
        mode="create"
        availableGroups={groups.map((g) => ({ id: g.id, name: g.name, emoji: g.emoji }))}
        redirectTo="/admin/assignments"
      />
    </div>
  );
}
