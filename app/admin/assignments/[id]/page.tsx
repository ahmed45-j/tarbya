import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Assignment, EncouragementMessage, Group } from "@/lib/supabase/types";
import { AssignmentForm } from "@/components/shared/AssignmentForm";
import { MessagesManager } from "@/components/shared/MessagesManager";

export default async function EditAdminAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: assignment } = await supabase.from("assignments").select("*").eq("id", id).single();
  if (!assignment) notFound();

  const { data: allGroupsData } = await supabase.from("groups").select("*");
  const groups = (allGroupsData ?? []) as Group[];

  const { data: linksData } = await supabase
    .from("assignment_groups")
    .select("group_id")
    .eq("assignment_id", id);
  const selectedGroupIds = (linksData ?? []).map((l) => l.group_id);

  const { data: messagesData } = await supabase
    .from("encouragement_messages")
    .select("*")
    .eq("assignment_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-7">
      <h1 className="font-display text-xl font-bold text-ink">تعديل التكليف</h1>

      <AssignmentForm
        mode="edit"
        assignment={assignment as Assignment}
        selectedGroupIds={selectedGroupIds}
        availableGroups={groups.map((g) => ({ id: g.id, name: g.name, emoji: g.emoji }))}
        redirectTo="/admin/assignments"
      />

      <div>
        <h2 className="mb-2.5 font-display text-base font-bold text-ink">💬 رسائل التشجيع</h2>
        <MessagesManager assignmentId={id} initialMessages={(messagesData ?? []) as EncouragementMessage[]} />
      </div>
    </div>
  );
}
