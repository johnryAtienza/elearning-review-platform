export type UserRole = 'user' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  /** Sourced from app_metadata — can only be set server-side. */
  role: UserRole
}
