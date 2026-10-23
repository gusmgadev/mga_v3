import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cliente: SupabaseClient | null = null

/**
 * Cliente de Supabase para la zona de acceso (olvide/reset de contraseña).
 * Usa la anon key (zona A, AGENTS §9); no tiene privilegios (RLS + GRANT por columna).
 */
export function supabaseAuthBrowser(): SupabaseClient {
  if (!cliente) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) {
      throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }
    cliente = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        storageKey: 'mga-acceso',
        flowType: 'pkce',
        autoRefreshToken: false,
      },
    })
  }
  return cliente
}
