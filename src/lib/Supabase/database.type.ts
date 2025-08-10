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
      Parqueos: {
        Row: {
          id: string
          name: string
          address: string | null
          latitude: number
          longitude: number
          total_spaces: number
          available_spaces: number
          price: number | null
          is_price_hour: boolean
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          latitude: number
          longitude: number
          total_spaces: number
          available_spaces: number
          price_per_hour?: number | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          latitude?: number
          longitude?: number
          type?: 'public' | 'private'
          total_spaces?: number
          available_spaces?: number
          price_per_hour?: number | null
          is_active?: boolean
          created_at?: string
        }
      }
      Reservaciones: {
        Row: {
          id: string
          parking_id: string
          user_id: string
          start_time: string
          end_time: string
          status: 'confirmed' | 'completed' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          parking_id: string
          user_id: string
          start_time: string
          end_time: string
          status: 'confirmed' | 'completed' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          parking_id?: string
          user_id?: string
          start_time?: string
          end_time?: string
          status?: 'confirmed' | 'completed' | 'cancelled'
          created_at?: string
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}