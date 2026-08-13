import { apiFetch } from './api.js'

export async function getDirectoryUsers() {
  const response = await apiFetch('/api/directory/users')
  return response?.data ?? []
}

export async function getDirectoryDepartments() {
  const response = await apiFetch('/api/directory/departments')
  return response?.data ?? []
}