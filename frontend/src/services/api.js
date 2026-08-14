const TOKEN_STORAGE_KEY = 'pilargroup_token'

export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(
  /\/$/,
  '',
)

function getTokenFromUrl() {
  if (typeof window === 'undefined') {
    return null
  }

  const url = new URL(window.location.href)
  const token = url.searchParams.get('token')

  if (!token) {
    return null
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, token)

  // Hapus token dari URL setelah disimpan,
  // tapi pertahankan query lain seperti source dan project.
  url.searchParams.delete('token')

  window.history.replaceState(
    {},
    document.title,
    `${url.pathname}${url.search}${url.hash}`,
  )

  return token
}

export function getStoredToken() {
  if (typeof window === 'undefined') {
    return null
  }

  // Token dari PilarGroup URL selalu diprioritaskan.
  const urlToken = getTokenFromUrl()

  if (urlToken) {
    return urlToken
  }

  return window.localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setStoredToken(token) {
  if (typeof window === 'undefined') {
    return
  }

  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

export async function apiFetch(path, options = {}) {
  const token = getStoredToken()

  const headers = {
    Accept: 'application/json',
    ...options.headers,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  let body

  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (!response.ok) {
    const error = new Error(body?.message || 'Request failed')
    error.status = response.status
    error.code = body?.errors?.code || body?.code || null
    throw error
  }

  return body
}