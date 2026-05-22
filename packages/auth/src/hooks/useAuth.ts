import { useAuthStore } from '../authStore'

export function useAuth() {
  return useAuthStore()
}
