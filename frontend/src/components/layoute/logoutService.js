export async function submitLogout() {
  if (typeof window === 'undefined') {
    return
  }

  window.history.pushState({}, '', '/login')
  window.dispatchEvent(new PopStateEvent('popstate'))
}
