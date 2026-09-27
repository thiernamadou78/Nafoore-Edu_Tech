import { supabase } from './supabaseClient'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Au-dela, on abandonne avec un message clair plutot que de laisser un
// chargement sans fin (reseau faible, serveur qui redemarre).
const REQUEST_TIMEOUT_MS = 30000
const UPLOAD_TIMEOUT_MS = 120000

async function send(path, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch (err) {
    const error = new Error(
      err?.name === 'AbortError'
        ? 'Le serveur met trop de temps à répondre. Vérifie ta connexion et réessaie.'
        : 'Connexion impossible. Vérifie ta connexion internet et réessaie.',
    )
    error.status = 0
    throw error
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message
    const error = new Error(message || `Erreur ${response.status}`)
    error.status = response.status
    error.body = body
    throw error
  }

  if (response.status === 204) return null
  return response.json()
}

function jsonRequest(path, options = {}) {
  return send(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
}

export const api = {
  get: (path) => jsonRequest(path),
  post: (path, body) => jsonRequest(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => jsonRequest(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => jsonRequest(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (path) => jsonRequest(path, { method: 'DELETE' }),
  upload: (path, formData) => send(path, { method: 'POST', body: formData }, UPLOAD_TIMEOUT_MS),
}
