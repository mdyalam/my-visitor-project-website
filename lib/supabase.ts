import { createClient } from "@supabase/supabase-js"

const supabaseUrl = ''
const supabaseAnonKey = ''

// Check if environment variables are available
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase environment variables not found. Please add Supabase integration.")
}

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

export type Visitor = {
  host: string
  email: string
  company_name: string
  photo_id_type: string
  photo_id_number: string
  from_date: string
  to_date: string
  visitor_type: string
  assets: any
  special_permissions: any
  remarks: string
  id: string
  name: string
  vehicle_number: string
  phone?: string
  purpose?: string
  photo_url?: string
  check_in_time: string
  check_out_time?: string
  status: "checked_in" | "checked_out"
  created_at: string
  updated_at: string
}
