// Re-export shim — real implementation lives in @s-class/api/secureContent.
// Removed in Phase 5 when /src is decommissioned.
export { getSignedContentUrls, getSignedSolutionUrl, SecureContentFetchError } from '@s-class/api/secureContent'
export type { SecureContentResult, SecureSolutionResult, SecureContentError } from '@s-class/api/secureContent'
