import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const cle = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !cle) {
  throw new Error(
    "Configuration Supabase manquante : renseigner VITE_SUPABASE_URL et " +
      'VITE_SUPABASE_PUBLISHABLE_KEY dans .env.local (voir .env.example). ' +
      "La clé secrète ne doit JAMAIS figurer côté navigateur.",
  )
}

// Seules l'URL et la clé publique vivent côté navigateur (voir CLAUDE.md).
export const supabase = createClient<Database>(url, cle, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
