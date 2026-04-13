import { useEffect } from 'react'

/**
 * Blocks common keyboard shortcuts used to open DevTools or view page source.
 * This is a deterrent — browser menus still work, so this cannot fully prevent access.
 * Applied document-wide while the component using this hook is mounted.
 *
 * @param enabled - Pass false to no-op (e.g. admin users or dev mode)
 */
export function useContentProtection(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(e: KeyboardEvent) {
      const ctrl  = e.ctrlKey || e.metaKey
      const shift = e.shiftKey
      const key   = e.key

      const blocked =
        key === 'F12'                             ||   // DevTools
        (ctrl && shift && key === 'I')            ||   // Inspect
        (ctrl && shift && key === 'J')            ||   // Console
        (ctrl && shift && key === 'C')            ||   // Inspect element
        (ctrl && key === 'u')                     ||   // View source
        (ctrl && key === 'U')                     ||   // View source (uppercase)
        (e.metaKey && e.altKey && key === 'I')         // Mac DevTools

      if (blocked) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    // Capture phase so it runs before other handlers
    document.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [enabled])
}
