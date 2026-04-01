import config from '@/config'

/**
 * Thin wrapper around localStorage for JWT token management.
 * Centralised here so swapping to httpOnly cookies or a secure store
 * requires changing only this file.
 */
export const tokenService = {
  getToken(): string | null {
    return localStorage.getItem(config.auth.tokenKey)
  },

  setToken(token: string): void {
    localStorage.setItem(config.auth.tokenKey, token)
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(config.auth.refreshTokenKey)
  },

  setRefreshToken(token: string): void {
    localStorage.setItem(config.auth.refreshTokenKey, token)
  },

  clearTokens(): void {
    localStorage.removeItem(config.auth.tokenKey)
    localStorage.removeItem(config.auth.refreshTokenKey)
  },
}
