// أنواع TypeScript يدوية تعكس supabase/schema.sql
// إن أردت لاحقًا توليدها تلقائيًا من مشروعك الحقيقي:
//   npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts

export type UserRole = "admin" | "teacher" | "student";
export type AssignmentType = "daily" | "weekly" | "multiple";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  group_id: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  teacher_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string | null;
  type: AssignmentType;
  points: number;
  times_required: number;
  needs_description: boolean;
  active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface AssignmentGroup {
  assignment_id: string;
  group_id: string;
}

export interface EncouragementMessage {
  id: string;
  assignment_id: string;
  message: string;
  created_by: string | null;
  created_at: string;
}

export interface Completion {
  id: string;
  student_id: string;
  assignment_id: string;
  occurred_on: string;
  times_completed: number;
  description: string | null;
  points_earned: number;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeacherNote {
  id: string;
  student_id: string;
  teacher_id: string;
  note: string;
  created_at: string;
}

export interface RecordCompletionResult {
  completion: Completion;
  message: string | null;
  points_earned: number;
  times_completed: number;
  times_required: number;
}

export interface LeaderboardRow {
  student_id: string;
  full_name: string;
  commitment_pct: number;
  points_this_week: number;
  streak: number;
}

// تعريف مبسّط متوافق مع النوع العام الذي يتوقعه @supabase/supabase-js / @supabase/ssr
// (غير مولّد تلقائيًا بالكامل، لكنه يكفي لسلامة الأنواع الأساسية في هذا المشروع)
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> };
      groups: { Row: Group; Insert: Partial<Group>; Update: Partial<Group> };
      assignments: { Row: Assignment; Insert: Partial<Assignment>; Update: Partial<Assignment> };
      assignment_groups: { Row: AssignmentGroup; Insert: AssignmentGroup; Update: Partial<AssignmentGroup> };
      encouragement_messages: {
        Row: EncouragementMessage;
        Insert: Partial<EncouragementMessage>;
        Update: Partial<EncouragementMessage>;
      };
      completions: { Row: Completion; Insert: Partial<Completion>; Update: Partial<Completion> };
      teacher_notes: { Row: TeacherNote; Insert: Partial<TeacherNote>; Update: Partial<TeacherNote> };
    };
    Functions: {
      record_completion: {
        Args: { p_assignment_id: string; p_delta?: number; p_description?: string | null };
        Returns: RecordCompletionResult;
      };
      get_student_streak: {
        Args: { p_student_id: string };
        Returns: number;
      };
      get_group_leaderboard: {
        Args: { p_group_id: string };
        Returns: LeaderboardRow[];
      };
    };
  };
};
