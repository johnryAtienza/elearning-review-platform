/**
 * Feature-level auth service.
 * All auth consumers (store, hooks, components) call these functions.
 * Nothing outside this file should import from @/services/authApi directly.
 */
import {
  authApi,
  type LoginCredentials,
  type RegisterData,
  type AuthResponse,
} from '@/services/authApi'
import type { User } from '../types'

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  return authApi.login(credentials)
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  return authApi.register(data)
}

export async function logout(): Promise<void> {
  return authApi.logout()
}

export async function refreshToken(): Promise<string | null> {
  return authApi.refreshToken()
}

export async function getSession(): Promise<User | null> {
  return authApi.getSession()
}

/**
 * Subscribe to auth state changes (sign-in, sign-out, token refresh).
 * Returns an unsubscribe function — call it on cleanup.
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  return authApi.onAuthChange(callback)
}

export type { LoginCredentials, RegisterData, AuthResponse }
