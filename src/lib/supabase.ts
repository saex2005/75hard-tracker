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
  insight_done: boolean
  insight_minutes: number
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

export type PushSubscription = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
}

export type ChallengeState = {
  id: number
  current_run_start: string
  total_restarts: number
  best_streak: number
}

export type Food = {
  id: string
  source: 'off' | 'generic' | 'custom'
  barcode: string | null
  name: string
  brand: string | null
  kcal_100: number
  protein_100: number
  carbs_100: number
  fat_100: number
  fiber_100: number | null
  serving_g: number | null
  serving_name: string | null
  source_ref: string | null
  search_text: string | null
  created_at: string
}

export type AssistantMemory = {
  id: string
  content: string
  created_at: string
}

export type ChatMessageRow = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export type MealSlot = 'desayuno' | 'almuerzo' | 'merienda' | 'cena' | 'extra'

export type FoodLog = {
  id: string
  date: string
  meal: MealSlot
  food_id: string | null
  food_name: string
  grams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  created_at: string
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
          insight_done?: boolean
          insight_minutes?: number
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
          insight_done?: boolean
          insight_minutes?: number
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
      push_subscriptions: {
        Row: PushSubscription
        Insert: {
          id?: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
        }
        Update: {
          id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
        }
        Relationships: []
      }
      foods: {
        Row: Food
        Insert: {
          id?: string
          source: 'off' | 'generic' | 'custom'
          barcode?: string | null
          name: string
          brand?: string | null
          kcal_100: number
          protein_100: number
          carbs_100: number
          fat_100: number
          fiber_100?: number | null
          serving_g?: number | null
          serving_name?: string | null
          source_ref?: string | null
          search_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          source?: 'off' | 'generic' | 'custom'
          barcode?: string | null
          name?: string
          brand?: string | null
          kcal_100?: number
          protein_100?: number
          carbs_100?: number
          fat_100?: number
          fiber_100?: number | null
          serving_g?: number | null
          serving_name?: string | null
          source_ref?: string | null
          search_text?: string | null
          created_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: ChatMessageRow
        Insert: {
          id?: string
          role: 'user' | 'assistant'
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'user' | 'assistant'
          content?: string
          created_at?: string
        }
        Relationships: []
      }
      assistant_memories: {
        Row: AssistantMemory
        Insert: {
          id?: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          content?: string
          created_at?: string
        }
        Relationships: []
      }
      food_logs: {
        Row: FoodLog
        Insert: {
          id?: string
          date: string
          meal: MealSlot
          food_id?: string | null
          food_name: string
          grams: number
          kcal: number
          protein: number
          carbs: number
          fat: number
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          meal?: MealSlot
          food_id?: string | null
          food_name?: string
          grams?: number
          kcal?: number
          protein?: number
          carbs?: number
          fat?: number
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      search_foods: {
        Args: { q: string }
        Returns: Food[]
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

// Fallback para build time — en runtime Vercel inyecta los valores reales
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
