import { apiFetch } from './api.js'

export async function getBigQueryDatasets() {
  const response = await apiFetch('/api/bigquery/datasets')
  return response?.data ?? []
}

export async function getBigQueryTables(datasetId) {
  const response = await apiFetch(`/api/bigquery/datasets/${encodeURIComponent(datasetId)}/tables`)
  return response?.data ?? []
}

export async function getBigQueryTable(datasetId, tableId) {
  const response = await apiFetch(
    `/api/bigquery/datasets/${encodeURIComponent(datasetId)}/tables/${encodeURIComponent(tableId)}`,
  )
  return response?.data ?? null
}

export async function validateBigQueryLoad(payload) {
  const response = await apiFetch('/api/bigquery/validate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return response?.data ?? null
}

export async function createBigQueryLoad(payload) {
  const response = await apiFetch('/api/bigquery/loads', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return response?.data ?? null
}

export async function getBigQueryLoad(id) {
  const response = await apiFetch(`/api/bigquery/loads/${id}`)
  return response?.data ?? null
}

export async function getBigQueryAccessList() {
  const response = await apiFetch('/api/bigquery/access')
  return response?.data ?? []
}

export async function createBigQueryAccess(payload) {
  const response = await apiFetch('/api/bigquery/access', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return response?.data ?? null
}

export async function updateBigQueryAccess(id, payload) {
  const response = await apiFetch(`/api/bigquery/access/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return response?.data ?? null
}

export async function deleteBigQueryAccess(id) {
  const response = await apiFetch(`/api/bigquery/access/${id}`, {
    method: 'DELETE',
  })
  return response?.data ?? null
}
