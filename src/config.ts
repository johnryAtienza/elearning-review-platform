/**
 * Centralised runtime config derived from environment variables.
 * All env access in the app should go through this file — never read
 * import.meta.env directly in component or service code.
 */

type AuthProvider = 'mock' | 'rest' | 'supabase' | 'firebase'

const config = {
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
    /** Display price for the Standard plan. Update here when pricing changes. */
    standardPricePerMonth: '$9',
    /** @deprecated use standardPricePerMonth */
    proPricePerMonth: '$9',
  },
  limits: {
    /** Free tier: max video preview seconds (env: VITE_FREE_VIDEO_PREVIEW_SECONDS) */
    freeVideoPreviewSeconds: Number(import.meta.env.VITE_FREE_VIDEO_PREVIEW_SECONDS ?? 30),
    /** Free tier: max PDF pages visible (env: VITE_FREE_PDF_MAX_PAGES) */
    freePdfMaxPages: Number(import.meta.env.VITE_FREE_PDF_MAX_PAGES ?? 5),
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
