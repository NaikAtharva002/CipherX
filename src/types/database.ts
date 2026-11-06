export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'organiser' | 'participant'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'organiser' | 'participant'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'organiser' | 'participant'
          created_at?: string
          updated_at?: string
        }
      }
      event_settings: {
        Row: {
          id: string
          name: string
          description: string | null
          status: 'upcoming' | 'active' | 'paused' | 'ended'
          start_time: string | null
          end_time: string | null
          duration_minutes: number
          max_teams: number
          hint_penalty_seconds: number
          wrong_answer_penalty_seconds: number
          allow_hints: boolean
          auto_check_answers: boolean
          final_vault_password: string | null
          final_vault_hint: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['event_settings']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['event_settings']['Insert']>
      }
      teams: {
        Row: {
          id: string
          team_id: string
          name: string
          password: string
          current_checkpoint_order: number
          total_points: number
          total_penalties_seconds: number
          hints_used: number
          status: 'registered' | 'active' | 'completed' | 'disqualified'
          started_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['teams']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['teams']['Insert']>
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          name: string
          role: string
          phone: string | null
          email: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['team_members']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['team_members']['Insert']>
      }
      checkpoints: {
        Row: {
          id: string
          order_index: number
          title: string
          location: string | null
          description: string | null
          qr_code_token: string
          is_active: boolean
          is_final: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['checkpoints']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['checkpoints']['Insert']>
      }
      challenges: {
        Row: {
          id: string
          checkpoint_id: string
          title: string
          description: string
          challenge_type: string
          correct_answer: string
          answer_case_sensitive: boolean
          multiple_choice_options: Json | null
          hint: string | null
          difficulty: 'easy' | 'medium' | 'hard' | 'extreme'
          time_limit_seconds: number
          points: number
          wrong_answer_penalty: number
          hint_penalty: number
          image_url: string | null
          audio_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['challenges']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['challenges']['Insert']>
      }
      team_progress: {
        Row: {
          id: string
          team_id: string
          checkpoint_id: string
          challenge_id: string | null
          status: 'locked' | 'unlocked' | 'scanning' | 'solving' | 'completed'
          scanned_at: string | null
          started_solving_at: string | null
          completed_at: string | null
          points_earned: number
          penalties_applied: number
          hints_used: number
        }
        Insert: Omit<Database['public']['Tables']['team_progress']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['team_progress']['Insert']>
      }
      submissions: {
        Row: {
          id: string
          team_id: string
          challenge_id: string
          checkpoint_id: string
          submitted_answer: string
          is_correct: boolean | null
          points_before: number
          points_after: number
          penalty_applied: number
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['submissions']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['submissions']['Insert']>
      }
      hint_requests: {
        Row: {
          id: string
          team_id: string
          challenge_id: string
          checkpoint_id: string
          hint_text: string | null
          penalty_seconds: number
          approved_by: string | null
          approved_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['hint_requests']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['hint_requests']['Insert']>
      }
      score_adjustments: {
        Row: {
          id: string
          team_id: string
          adjusted_by: string
          adjustment_type: 'bonus' | 'penalty' | 'correction'
          points_delta: number
          reason: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['score_adjustments']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['score_adjustments']['Insert']>
      }
      qr_scans: {
        Row: {
          id: string
          team_id: string
          checkpoint_id: string
          qr_token: string
          is_valid: boolean
          error_reason: string | null
          scanned_at: string
        }
        Insert: Omit<Database['public']['Tables']['qr_scans']['Row'], 'id' | 'scanned_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['qr_scans']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type EventSettings = Database['public']['Tables']['event_settings']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type TeamMember = Database['public']['Tables']['team_members']['Row']
export type Checkpoint = Database['public']['Tables']['checkpoints']['Row']
export type Challenge = Database['public']['Tables']['challenges']['Row']
export type TeamProgress = Database['public']['Tables']['team_progress']['Row']
export type Submission = Database['public']['Tables']['submissions']['Row']
export type HintRequest = Database['public']['Tables']['hint_requests']['Row']
export type ScoreAdjustment = Database['public']['Tables']['score_adjustments']['Row']
export type QrScan = Database['public']['Tables']['qr_scans']['Row']
