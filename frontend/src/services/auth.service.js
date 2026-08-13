import { apiFetch } from './api.js'

export async function getCurrentUser() {
  const response = await apiFetch('/api/auth/me')
  return response?.data ?? null
}
