import { loadEnv, type ServerOptions } from 'vite'

const PUBLIC_ASSET_PREFIXES = [
  '/avatars',
  '/covers',
  '/quizzes',
  '/thumbnails',
] as const

function isLocalOrigin(url: URL): boolean {
  return ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
}

function getPublicAssetProxyTarget(mode: string, envDir: string): string | undefined {
  const env = loadEnv(mode, envDir, '')
  const candidates = [
    env.VITE_PUBLIC_ASSET_PROXY_URL,
    env.VITE_R2_PUBLIC_URL,
    env.VITE_LANDING_URL,
  ]

  for (const candidate of candidates) {
    if (!candidate) continue

    try {
      const url = new URL(candidate)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') continue
      if (isLocalOrigin(url)) continue
      return url.origin
    } catch {
      /* ignore invalid local env values */
    }
  }

  return undefined
}

export function publicAssetProxy(mode: string, envDir: string): ServerOptions['proxy'] {
  const target = getPublicAssetProxyTarget(mode, envDir)
  if (!target) return undefined

  return Object.fromEntries(
    PUBLIC_ASSET_PREFIXES.map(prefix => [
      prefix,
      {
        target,
        changeOrigin: true,
        secure: true,
      },
    ]),
  )
}
