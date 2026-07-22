// Barrel re-export. Prefer subpath imports in app code
// (e.g. `import { subjectApi } from '@s-class/api/subjectApi'`)
// to keep things tree-shake-friendly.

// Infrastructure (2.5a)
export { ApiError } from './ApiError'
export type { ApiErrorBody } from './ApiError'
export { apiClient } from './apiClient'
export { supabase } from './supabaseClient'
export { tokenService } from './tokenService'
export { uploadToStorage } from './storageClient'
export type {
  UploadProgressEvent,
  StorageUploadResult,
  ProgressCallback,
} from './storageClient'
export { storagePaths } from './storagePaths'
export { getSignedContentUrls, SecureContentFetchError } from './secureContent'
export type { SecureContentResult, SecureContentError } from './secureContent'

// Provider-routed APIs (2.5b/c)
export { authApi } from './authApi'
export type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
} from './authApi'
export { booksApi } from './booksApi'
export * as coursesApi from './coursesApi'
export { subjectApi } from './subjectApi'
export { devicesApi } from './devicesApi'
export { homeContentApi } from './homeContentApi'
export { reviewPackagesApi } from './reviewPackagesApi'
export { lessonApi } from './lessonApi'
export { lessonProgressApi } from './lessonProgressApi'
export { quizApi } from './quizApi'
export { quizResultsApi } from './quizResultsApi'
export * as savedSubjectsApi from './savedSubjectsApi'
export { subscriptionApi } from './subscriptionApi'
