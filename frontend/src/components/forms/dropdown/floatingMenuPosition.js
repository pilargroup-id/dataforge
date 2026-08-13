// The app applies a CSS `zoom` (see src/theme/index.css) to scale the whole
// UI down. `zoom` is not inherited, and it re-scales pixel values assigned to
// `position: fixed` descendants, but `getBoundingClientRect()` always reports
// already-zoomed (real on-screen) pixels. Writing a rect straight into a
// fixed element's inline style therefore gets scaled a second time. Dividing
// by the accumulated zoom of the portal's mount point cancels that out.
function getElementZoom(element) {
  const value = Number.parseFloat(window.getComputedStyle(element).zoom)
  return Number.isFinite(value) && value > 0 ? value : 1
}

function getAccumulatedZoom(fromElement) {
  let zoom = 1
  let node = fromElement
  while (node) {
    zoom *= getElementZoom(node)
    node = node.parentElement
  }
  return zoom
}

export function getFloatingMenuPosition(triggerElement, { offset = 8 } = {}) {
  const rect = triggerElement?.getBoundingClientRect()
  if (!rect) return null

  const zoom = getAccumulatedZoom(document.body)

  return {
    top: (rect.bottom + offset) / zoom,
    left: rect.left / zoom,
    width: rect.width / zoom,
  }
}
