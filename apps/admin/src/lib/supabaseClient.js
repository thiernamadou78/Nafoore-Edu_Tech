import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

if (!useMocks && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requis')
}

// En mode démo (VITE_USE_MOCKS=true), aucun appel Supabase réel n'est fait —
// voir authAdapter.js, qui bascule sur src/lib/mock/ à la place.
export const supabase = useMocks ? null : createClient(supabaseUrl, supabaseAnonKey)
