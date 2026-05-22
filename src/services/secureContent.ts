// Re-export shim — real implementation lives in @s-class/api/secureContent.
// Removed in Phase 5 when /src is decommissioned.
export { getSignedContentUrls, SecureContentFetchError } from '@s-class/api/secureContent'
export type { SecureContentResult, SecureContentError } from '@s-class/api/secureContent'
