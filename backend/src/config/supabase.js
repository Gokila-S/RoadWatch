import { createClient } from '@supabase/supabase-js'
import { env } from './env.js'

let cachedClient = null

const isConfiguredValue = (value) => {
  if (!value) return false
  const normalized = String(value).trim().toLowerCase()
  if (!normalized) return false
  if (normalized.includes('replace-with-your-service-role-key')) return false
  if (normalized.includes('your-service-role-key')) return false
  return true
}

export const getSupabaseAdmin = () => {
  if (!isConfiguredValue(env.supabaseUrl) || !isConfiguredValue(env.supabaseServiceRoleKey)) {
    throw new Error('Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env')
  }

  if (cachedClient) {
    return cachedClient
  }

  cachedClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return cachedClient
}
