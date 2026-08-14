import { apiFetch } from './api.js'

export async function getMyPermissions() {
  const response = await apiFetch('/api/permissions/me')
  return response?.data ?? { is_it: false, modules: [] }
}

export async function getPermissionCatalog() {
  const response = await apiFetch('/api/permissions/catalog')
  return response?.data ?? []
}

export async function getPermissionAssignments() {
  const response = await apiFetch('/api/permissions')
  return response?.data ?? []
}

export async function createPermissionAssignment(payload) {
  const response = await apiFetch('/api/permissions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return response?.data ?? null
}
