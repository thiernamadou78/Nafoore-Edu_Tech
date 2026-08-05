// Bascule entre Supabase Auth réel et l'auth factice du mode démo.
// AuthContext et api.js n'utilisent que `authClient.auth.*`, jamais supabaseClient
// directement, pour que ce fichier soit le seul endroit à connaître le mode démo.
import { supabase } from './supabaseClient'
import * as mockAuth from './mock/mockAuth'

const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

export const authClient = useMocks
  ? {
      auth: {
        getSession: mockAuth.getSession,
        onAuthStateChange: mockAuth.onAuthStateChange,
        signInWithPassword: mockAuth.signInWithPassword,
        signOut: mockAuth.signOut,
      },
    }
  : supabase
