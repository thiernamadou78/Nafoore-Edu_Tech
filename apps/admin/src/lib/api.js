import { authClient } from './authAdapter'
import { mockRequest } from './mock/mockApi'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

async function send(path, options = {}) {
  if (useMocks) {
    return mockRequest(path, options)
  }

  const { data } = await authClient.auth.getSession()
  const token = data.session?.access_token

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message
    throw new Error(message || `Erreur ${response.status}`)
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
  patch: (path, body) => jsonRequest(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (path) => jsonRequest(path, { method: 'DELETE' }),
  // Pas de Content-Type ici : le navigateur doit fixer le boundary multipart lui-même.
  upload: (path, formData) => send(path, { method: 'POST', body: formData }),
}
