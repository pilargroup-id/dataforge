import { apiFetch } from './api.js'

export async function getPermissionCatalog() {
  const response = await apiFetch('/api/permissions/catalog')
  return response?.data ?? []
}

export async function createPermissionAssignment(payload) {
  const response = await apiFetch('/api/permissions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return response?.data ?? null
}
