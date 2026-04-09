import config from '@/config'
import type { User } from '@/features/auth/types'
import { apiClient } from './apiClient'
import { tokenService } from './tokenService'

// ── Shared types ──────────────────────────────────────────────────────────────

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  firstName: string
  lastName: string
  email: string
  password: string
  mobileNumber: string
}

export interface AuthResponse {
  user: User
  token: string
  refreshToken?: string
  /**
   * True when Supabase email confirmation is enabled and the user just
   * registered — no session exists yet. The user must confirm their email
   * before they can sign in.
   */
  awaitingConfirmation?: boolean
}

// ── Provider interface ────────────────────────────────────────────────────────

interface IAuthProvider {
  login(credentials: LoginCredentials): Promise<AuthResponse>
  register(data: RegisterData): Promise<AuthResponse>
  logout(): Promise<void>
  refreshToken(): Promise<string | null>
  /** Return the currently persisted session user, if any. */
  getSession(): Promise<User | null>
  /**
   * Subscribe to auth state changes (sign-in, sign-out, token refresh).
   * Returns an unsubscribe function — call it on cleanup.
   */
  onAuthChange(callback: (user: User | null) => void): () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function noopUnsubscribe() { return () => {} }

// ── Mock provider ─────────────────────────────────────────────────────────────

const mockProvider: IAuthProvider = {
  async login({ email }: LoginCredentials): Promise<AuthResponse> {
    return {
      user: { id: crypto.randomUUID(), name: email.split('@')[0], email, role: 'user' },
      token: 'mock-token',
    }
  },

  async register({ firstName, lastName, email }: RegisterData): Promise<AuthResponse> {
    const name = `${firstName} ${lastName}`.trim() || email.split('@')[0]
    return {
      user: { id: crypto.randomUUID(), name, firstName, lastName, email, mobileNumber: '', role: 'user' },
      token: 'mock-token',
    }
  },

  async logout(): Promise<void> {
    tokenService.clearTokens()
  },

  async refreshToken(): Promise<string | null> {
    return 'mock-token'
  },

  async getSession(): Promise<User | null> {
    return null   // mock has no persistent session
  },

  onAuthChange(_callback) {
    return noopUnsubscribe()
  },
}

// ── REST provider ─────────────────────────────────────────────────────────────

const restProvider: IAuthProvider = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/login', credentials)
    tokenService.setToken(res.token)
    if (res.refreshToken) tokenService.setRefreshToken(res.refreshToken)
    return res
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/register', data)
    tokenService.setToken(res.token)
    if (res.refreshToken) tokenService.setRefreshToken(res.refreshToken)
    return res
  },

  async logout(): Promise<void> {
    try { await apiClient.post('/auth/logout') } catch { /* ignore */ }
    tokenService.clearTokens()
  },

  async refreshToken(): Promise<string | null> {
    const refresh = tokenService.getRefreshToken()
    if (!refresh) return null
    try {
      const res = await apiClient.post<{ token: string }>('/auth/refresh', { refreshToken: refresh })
      tokenService.setToken(res.token)
      return res.token
    } catch {
      tokenService.clearTokens()
      return null
    }
  },

  async getSession(): Promise<User | null> {
    const token = tokenService.getToken()
    if (!token) return null
    try {
      return await apiClient.get<User>('/auth/me')
    } catch {
      tokenService.clearTokens()
      return null
    }
  },

  onAuthChange(_callback) {
    // REST APIs don't push auth events — the store drives state.
    return noopUnsubscribe()
  },
}

// ── Supabase provider ─────────────────────────────────────────────────────────

import type { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import { ApiError } from './ApiError'

function toUser(sbUser: SupabaseUser): User {
  const role = (sbUser.app_metadata?.role as string | undefined) === 'admin'
    ? 'admin' as const
    : 'user' as const

  const firstName = (sbUser.user_metadata?.first_name as string | undefined) ?? ''
  const lastName  = (sbUser.user_metadata?.last_name  as string | undefined) ?? ''
  const name = (firstName || lastName)
    ? `${firstName} ${lastName}`.trim()
    : ((sbUser.user_metadata?.name as string | undefined) ?? sbUser.email?.split('@')[0] ?? 'User')

  return {
    id:           sbUser.id,
    email:        sbUser.email ?? '',
    name,
    firstName,
    lastName,
    mobileNumber: (sbUser.user_metadata?.mobile_number as string | undefined) ?? '',
    role,
  }
}

const supabaseProvider: IAuthProvider = {
  async login({ email, password }: LoginCredentials): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new ApiError(401, 'AUTH_FAILED', error.message)
    return {
      user: toUser(data.user),
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
    }
  },

  async register({ firstName, lastName, email, password, mobileNumber }: RegisterData): Promise<AuthResponse> {
    const name = `${firstName} ${lastName}`.trim()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, first_name: firstName, last_name: lastName, mobile_number: mobileNumber },
      },
    })
    if (error) throw new ApiError(400, 'REGISTER_FAILED', error.message)
    if (!data.user) throw new ApiError(400, 'REGISTER_FAILED', 'Registration failed.')

    if (!data.session) {
      return { user: toUser(data.user), token: '', awaitingConfirmation: true }
    }

    return {
      user: toUser(data.user),
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
    }
  },

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    if (error) throw new ApiError(500, 'LOGOUT_FAILED', error.message)
  },

  async refreshToken(): Promise<string | null> {
    const { data, error } = await supabase.auth.refreshSession()
    if (error || !data.session) return null
    return data.session.access_token
  },

  async getSession(): Promise<User | null> {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user ? toUser(session.user) : null
  },

  onAuthChange(callback: (user: User | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ? toUser(session.user) : null)
    })
    return () => subscription.unsubscribe()
  },
}

// ── Factory ───────────────────────────────────────────────────────────────────

const providers: Record<string, IAuthProvider> = {
  mock:     mockProvider,
  rest:     restProvider,
  supabase: supabaseProvider,
}

function getProvider(): IAuthProvider {
  const key = config.auth.provider
  const provider = providers[key]
  if (!provider) {
    console.warn(`Unknown auth provider "${key}", falling back to mock.`)
    return mockProvider
  }
  return provider
}

// ── Public API ────────────────────────────────────────────────────────────────

export const authApi = {
  login:          (credentials: LoginCredentials) => getProvider().login(credentials),
  register:       (data: RegisterData)            => getProvider().register(data),
  logout:         ()                              => getProvider().logout(),
  refreshToken:   ()                              => getProvider().refreshToken(),
  getSession:     ()                              => getProvider().getSession(),
  onAuthChange:   (cb: (user: User | null) => void) => getProvider().onAuthChange(cb),
}
