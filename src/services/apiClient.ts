import config from '@/config'
import { ApiError, type ApiErrorBody } from './ApiError'
import { tokenService } from './tokenService'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions {
  /** Additional headers merged on top of the defaults. */
  headers?: Record<string, string>
  /** Pass signal to support AbortController / React Query cancellation. */
  signal?: AbortSignal
}

/**
 * Core HTTP client. All API service files call through here.
 *
 * Responsibilities:
 *  - Prefix every path with VITE_API_BASE_URL
 *  - Attach the Authorization Bearer token when present
 *  - Parse JSON responses
 *  - Throw typed ApiError on non-2xx responses
 *
 * To swap to axios: replace the `request` function body — the signature
 * and ApiError contract stay the same so nothing else changes.
 */
async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const token = tokenService.getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${config.api.baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options.signal,
  })

  // Parse body — even error responses may carry JSON
  let data: unknown
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    data = await response.json()
  }

  if (!response.ok) {
    const err = data as Partial<ApiErrorBody>
    throw new ApiError(
      response.status,
      err?.code ?? 'UNKNOWN_ERROR',
      err?.message ?? `HTTP ${response.status}`,
      err?.details,
    )
  }

  return data as T
}

export const apiClient = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>('GET', path, undefined, options)
  },

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('POST', path, body, options)
  },

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('PUT', path, body, options)
  },

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('PATCH', path, body, options)
  },

  del<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>('DELETE', path, undefined, options)
  },
}
