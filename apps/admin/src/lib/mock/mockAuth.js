// Auth factice pour le mode démo — mime la forme de `supabase.auth` utilisée par AuthContext.
import { mockCredentials } from './mockDb'

const STORAGE_KEY = 'mock-admin-account-id'
let currentAccountId = readStoredAccountId()
let listeners = []

function readStoredAccountId() {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function persistAccountId(accountId) {
  try {
    if (accountId) sessionStorage.setItem(STORAGE_KEY, accountId)
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // sessionStorage indisponible (mode privé, etc.) — la session ne survivra pas au refresh
  }
}

function buildSession() {
  if (!currentAccountId) return null
  return { access_token: `mock-token-${currentAccountId}`, user: { id: currentAccountId } }
}

function notify() {
  const session = buildSession()
  listeners.forEach((callback) => callback('SIGNED_IN', session))
}

export function getCurrentAccountId() {
  return currentAccountId
}

export async function getSession() {
  return { data: { session: buildSession() } }
}

export function onAuthStateChange(callback) {
  listeners.push(callback)
  return {
    data: {
      subscription: {
        unsubscribe: () => {
          listeners = listeners.filter((cb) => cb !== callback)
        },
      },
    },
  }
}

export async function signInWithPassword({ email, password }) {
  const match = mockCredentials.find((c) => c.email === email && c.password === password)
  if (!match) {
    return {
      error: {
        message:
          'Identifiants invalides (mode démo — voir apps/admin/src/lib/mock/mockDb.js pour les comptes disponibles)',
      },
    }
  }
  currentAccountId = match.accountId
  persistAccountId(currentAccountId)
  notify()
  return { error: null }
}

export async function signOut() {
  currentAccountId = null
  persistAccountId(null)
  notify()
  return { error: null }
}
