const EMPTY_COVER_VALUES = new Set(['', 'null', 'undefined'])
const COVER_PATH_PREFIX = '/covers/'
const COVER_KEY_PREFIX = 'covers/'

function normalizeCoverPath(path: string): string | null {
  const coverIndex = path.indexOf(COVER_PATH_PREFIX)
  const coverPath = coverIndex >= 0
    ? path.slice(coverIndex)
    : path.startsWith(COVER_KEY_PREFIX)
      ? `/${path}`
      : null

  if (!coverPath || coverPath === COVER_PATH_PREFIX) return null
  if (coverPath.split('/').some(segment => segment === '..')) return null

  return coverPath
}

export function normalizeBookCoverDisplayUrl(value?: string | null): string | null {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (EMPTY_COVER_VALUES.has(trimmed.toLowerCase())) return null

  if (trimmed.startsWith(COVER_PATH_PREFIX) || trimmed.startsWith(COVER_KEY_PREFIX)) {
    return normalizeCoverPath(trimmed)
  }

  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return normalizeCoverPath(url.pathname)
  } catch {
    return null
  }
}

export function normalizeBookCoverStorageKey(value?: string | null): string | null {
  return normalizeBookCoverDisplayUrl(value)?.slice(1) ?? null
}
