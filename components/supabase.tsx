import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://bslvajotbxxplqpamtik.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbHZham90Ynh4cGxxcGFtdGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MTE4NDksImV4cCI6MjA3MTI4Nzg0OX0.CY7FK9MuY3WwyoVgIrDM5l0lEVkSYJNxMb5FiwMrbZs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

