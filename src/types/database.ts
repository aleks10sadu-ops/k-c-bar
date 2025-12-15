export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type TaskType = 'prepare' | 'check' | 'inventory' | 'execute'
export type ActionType = 'task' | 'chat' | 'note'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue'
export type UserRole = 'admin' | 'bartender'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          telegram_id: number
          username: string | null
          first_name: string
          last_name: string | null
          photo_url: string | null
          role: UserRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          telegram_id: number
          username?: string | null
          first_name: string
          last_name?: string | null
          photo_url?: string | null
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          telegram_id?: number
          username?: string | null
          first_name?: string
          last_name?: string | null
          photo_url?: string | null
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          action_type: ActionType
          task_type: TaskType | null
          status: TaskStatus
          due_date: string
          assigned_to: string
          created_by: string
          completed_at: string | null
          file_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          action_type: ActionType
          task_type?: TaskType | null
          status?: TaskStatus
          due_date: string
          assigned_to: string
          created_by: string
          completed_at?: string | null
          file_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          action_type?: ActionType
          task_type?: TaskType | null
          status?: TaskStatus
          due_date?: string
          assigned_to?: string
          created_by?: string
          completed_at?: string | null
          file_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      task_type: TaskType
      action_type: ActionType
      task_status: TaskStatus
      user_role: UserRole
    }
  }
}

export type User = Database['public']['Tables']['users']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type NewTask = Database['public']['Tables']['tasks']['Insert']
export type UpdateTask = Database['public']['Tables']['tasks']['Update']

