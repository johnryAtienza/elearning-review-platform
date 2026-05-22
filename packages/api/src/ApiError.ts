/**
 * Typed error thrown by apiClient for any non-2xx response.
 * Catch this in feature services to handle specific status codes.
 *
 * @example
 * try {
 *   await authApi.login(email, password)
 * } catch (err) {
 *   if (err instanceof ApiError && err.status === 401) {
 *     // wrong credentials
 *   }
 * }
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  get isUnauthorized() { return this.status === 401 }
  get isForbidden()    { return this.status === 403 }
  get isNotFound()     { return this.status === 404 }
  get isServerError()  { return this.status >= 500 }
}

/** Shape the API is expected to return for error responses. */
export interface ApiErrorBody {
  code: string
  message: string
  details?: unknown
}
