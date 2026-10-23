import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cliente: SupabaseClient | null = null

/** Cliente service role (bypass RLS). Solo servidor; la zona pública jamás lo importa (SEP-4). */
export function supabaseAdmin(): SupabaseClient {
  if (!cliente) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceRole) {
      throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY')
    }
    cliente = createClient(url, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return cliente
}
