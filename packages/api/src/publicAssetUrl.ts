const EMPTY_ASSET_VALUES = new Set(['', 'null', 'undefined'])

const PUBLIC_ASSET_PATH_PREFIXES = [
  '/avatars/',
  '/covers/',
  '/quizzes/',
  '/thumbnails/',
] as const

const PUBLIC_ASSET_KEY_PREFIXES = [
  'avatars/',
  'covers/',
  'quizzes/',
  'thumbnails/',
] as const

function normalizeAssetPath(path: string): string | null {
  for (const prefix of PUBLIC_ASSET_PATH_PREFIXES) {
    const index = path.indexOf(prefix)
    if (index < 0) continue

    const assetPath = path.slice(index)
    if (assetPath === prefix) return null
    if (assetPath.split('/').some(segment => segment === '..')) return null
    return assetPath
  }

  for (const prefix of PUBLIC_ASSET_KEY_PREFIXES) {
    if (!path.startsWith(prefix)) continue

    const assetPath = `/${path}`
    if (assetPath.split('/').some(segment => segment === '..')) return null
    return assetPath
  }

  return null
}

export function normalizePublicAssetDisplayUrl(value?: string | null): string | null {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (EMPTY_ASSET_VALUES.has(trimmed.toLowerCase())) return null

  const normalizedPath = normalizeAssetPath(trimmed)
  if (normalizedPath) return normalizedPath

  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return normalizeAssetPath(url.pathname)
  } catch {
    return null
  }
}
