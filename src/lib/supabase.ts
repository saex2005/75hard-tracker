import { createClient } from '@supabase/supabase-js'

// Tipos de las filas de cada tabla
export type DayRecord = {
  id: string
  day_number: number
  date: string
  gym_done: boolean
  gym_minutes: number
  cardio_done: boolean
  cardio_minutes: number
  water_bottles: number
  diet_done: boolean
  reading_done: boolean
  reading_page: number
  photo_url: string | null
  completed: boolean
  created_at: string
}

export type WeightCheckpoint = {
  id: string
  date: string
  weight_kg: number
  notes: string | null
  created_at: string
}

export type ChallengeState = {
  id: number
  current_run_start: string
  total_restarts: number
  best_streak: number
}

// Esquema completo para Supabase (formato que espera el cliente)
export type Database = {
  public: {
    Tables: {
      days: {
        Row: DayRecord
        Insert: {
          id?: string
          day_number: number
          date: string
          gym_done?: boolean
          gym_minutes?: number
          cardio_done?: boolean
          cardio_minutes?: number
          water_bottles?: number
          diet_done?: boolean
          reading_done?: boolean
          reading_page?: number
          photo_url?: string | null
          completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          day_number?: number
          date?: string
          gym_done?: boolean
          gym_minutes?: number
          cardio_done?: boolean
          cardio_minutes?: number
          water_bottles?: number
          diet_done?: boolean
          reading_done?: boolean
          reading_page?: number
          photo_url?: string | null
          completed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      weight_checkpoints: {
        Row: WeightCheckpoint
        Insert: {
          id?: string
          date: string
          weight_kg: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          weight_kg?: number
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      challenge_state: {
        Row: ChallengeState
        Insert: {
          id?: number
          current_run_start: string
          total_restarts?: number
          best_streak?: number
        }
        Update: {
          id?: number
          current_run_start?: string
          total_restarts?: number
          best_streak?: number
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
