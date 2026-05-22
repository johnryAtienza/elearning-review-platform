// Re-export shim — real implementation lives in @s-class/api/storageClient.
// Removed in Phase 5 when /src is decommissioned.
export { uploadToStorage } from '@s-class/api/storageClient'
export type {
  UploadProgressEvent,
  StorageUploadResult,
  ProgressCallback,
} from '@s-class/api/storageClient'
