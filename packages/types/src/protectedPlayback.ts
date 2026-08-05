/**
 * Browser-safe playback information returned by the server after entitlement
 * checks. These fields are deliberately short-lived and contain no provider
 * credentials or signing keys.
 */
export interface ProtectedPlaybackConfig {
  mode: 'legacy' | 'drm'
  manifestUrl: string | null
  dashManifestUrl: string | null
  hlsManifestUrl: string | null
  licenseServers: Partial<Record<'widevine' | 'fairplay' | 'playready', string>>
  licenseToken: string | null
  fairPlayCertificateUrl: string | null
  sessionId: string | null
  expiresAt: string | null
  watermarkLabel: string | null
}
