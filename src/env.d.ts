/// <reference types="vite/client" />

interface ImportMetaEnv {
  // ── API ───────────────────────────────────────────────────────────────────
  /** Base URL for all REST API calls. E.g. https://api.yourdomain.com/v1 */
  readonly VITE_API_BASE_URL: string

  /** Set to "true" to use local mock data instead of hitting real endpoints. */
  readonly VITE_USE_MOCK: string

  // ── Auth provider ─────────────────────────────────────────────────────────
  /** Which auth provider to use: "mock" | "rest" | "firebase" */
  readonly VITE_AUTH_PROVIDER: string

  // ── Supabase (only required when VITE_AUTH_PROVIDER=supabase) ────────────
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string

  // ── Firebase (only required when VITE_AUTH_PROVIDER=firebase) ────────────
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string

  // ── Subdomain split (cross-app navigation targets) ────────────────────────
  /** Origin of the landing/marketing app. Defaults to https://s-class.com.ph */
  readonly VITE_LANDING_URL?: string
  /** Origin of the authenticated student app. Defaults to https://portal.s-class.com.ph */
  readonly VITE_PORTAL_URL?: string
  /** Origin of the admin panel. Defaults to https://admin.s-class.com.ph */
  readonly VITE_ADMIN_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
