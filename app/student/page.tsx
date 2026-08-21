import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cairoWeekStartISO } from "@/lib/date";
import { StudentHome } from "@/components/student/StudentHome";
import type { Assignment, Group, LeaderboardRow } from "@/lib/supabase/types";
import type { CardCompletionState } from "@/components/student/AssignmentCard";

export default async function StudentPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "student") redirect("/");

  const supabase = await createClient();

  let group: Group | null = null;
  if (profile.group_id) {
    const { data } = await supabase.from("groups").select("*").eq("id", profile.group_id).single();
    group = data as Group | null;
  }

  let assignments: Assignment[] = [];
  if (group) {
    const { data } = await supabase
      .from("assignment_groups")
      .select("assignments(*)")
      .eq("group_id", group.id);

    assignments = (data ?? [])
      .map((row) => row.assignments as unknown as Assignment)
      .filter((a): a is Assignment => !!a && a.active)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  const completions: Record<string, CardCompletionState> = {};
  if (assignments.length > 0) {
    const weekStart = cairoWeekStartISO();
    const { data: rows } = await supabase
      .from("completions")
      .select("assignment_id, times_completed, description, occurred_on")
      .eq("student_id", profile.id)
      .gte("occurred_on", weekStart)
      .in(
        "assignment_id",
        assignments.map((a) => a.id)
      );

    (rows ?? []).forEach((row) => {
      completions[row.assignment_id] = {
        timesCompleted: row.times_completed,
        description: row.description,
      };
    });
  }

  let leaderboard: LeaderboardRow[] = [];
  if (group) {
    const { data } = await supabase.rpc("get_group_leaderboard", { p_group_id: group.id });
    leaderboard = (data as LeaderboardRow[] | null) ?? [];
  }

  return (
    <StudentHome
      fullName={profile.full_name}
      group={group ? { id: group.id, name: group.name, emoji: group.emoji } : null}
      assignments={assignments}
      initialCompletions={completions}
      leaderboard={leaderboard}
      myId={profile.id}
    />
  );
}
