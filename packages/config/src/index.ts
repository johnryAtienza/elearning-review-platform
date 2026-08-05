/**
 * Centralised runtime config derived from environment variables.
 * All env access in the app should go through this file — never read
 * import.meta.env directly in component or service code.
 */

type AuthProvider = 'mock' | 'rest' | 'supabase' | 'firebase'

export type AppEnv = 'local' | 'staging' | 'production'

// Env-driven (not hostname-driven) so this module stays browser-safe and
// reusable from SSR / edge / worker contexts without touching `window`.
function detectAppEnv(): AppEnv {
  if (import.meta.env.DEV) return 'local'
  return import.meta.env.VITE_APP_ENV === 'staging' ? 'staging' : 'production'
}

const config = {
  /** Coarse-grained deployment environment. See AppEnv for values. */
  appEnv: detectAppEnv(),
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1',
    /** When true the app returns local mock data and makes no network calls. */
    useMock: import.meta.env.VITE_USE_MOCK === 'true',
  },
  auth: {
    provider: (import.meta.env.VITE_AUTH_PROVIDER ?? 'mock') as AuthProvider,
    /** localStorage key for the access token */
    tokenKey: 'access_token',
    /** localStorage key for the refresh token */
    refreshTokenKey: 'refresh_token',
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL ?? '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  },
  subscription: {
    /**
     * Base price per month in the local currency (PHP by default).
     * Duration discounts are applied on top of this rate.
     * Configurable via VITE_SUBSCRIPTION_BASE_PRICE.
     */
    basePricePerMonth: Number(import.meta.env.VITE_SUBSCRIPTION_BASE_PRICE ?? 299),
    /** Currency symbol shown in the UI */
    currency: (import.meta.env.VITE_SUBSCRIPTION_CURRENCY as string | undefined) ?? '₱',
    /** Fractional discounts applied to multi-month plans (0.10 = 10% off) */
    discounts: {
      months3: 0.10,
      months6: 0.20,
    },
    /** @deprecated — kept so existing imports don't break */
    standardPricePerMonth: '₱299',
  },
  limits: {
    /** Free tier: max video preview seconds (env: VITE_FREE_VIDEO_PREVIEW_SECONDS) */
    freeVideoPreviewSeconds: Number(import.meta.env.VITE_FREE_VIDEO_PREVIEW_SECONDS ?? 30),
    /** Free tier: max PDF pages visible (env: VITE_FREE_PDF_MAX_PAGES) */
    freePdfMaxPages: Number(import.meta.env.VITE_FREE_PDF_MAX_PAGES ?? 5),
  },
  /**
   * Optional content deterrents. These are not DRM and are not used as the
   * playback security boundary. DRM authorization lives in the Edge Function
   * and per-lesson DRM metadata.
   */
  protection: {
    /** Master switch for the optional visible watermark. */
    enabled: import.meta.env.VITE_CONTENT_PROTECTION_ENABLED !== 'false',
    /** Deprecated legacy flag; shortcut interception is not used by playback. */
    blockDevTools: false,
    /** Show semi-transparent watermark over protected video content */
    watermark: import.meta.env.VITE_PROTECTION_WATERMARK !== 'false',
    /** Deprecated legacy flag; focus heuristics are not used by playback. */
    detectCapture: false,
  },
  deviceLimit: {
    /**
     * Phase G — Netflix-style device cap (1 mobile + 1 desktop per account).
     * Disabled by default. Set VITE_DEVICE_LIMIT_ENABLED=true to enforce.
     * When off, registerCurrentDevice() is a no-op and DeviceLimitModal
     * never appears (applies to both the portal and admin apps).
     */
    enabled: import.meta.env.VITE_DEVICE_LIMIT_ENABLED === 'true',
  },
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
  },
} as const

export default config
