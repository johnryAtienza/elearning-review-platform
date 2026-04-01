/** Maximum file sizes for each upload type. Values are in bytes. */
export const UPLOAD_LIMITS = {
  /** 2 GB — lesson video */
  VIDEO: 2 * 1024 * 1024 * 1024,
  /** 50 MB — reviewer / study guide PDF */
  PDF: 50 * 1024 * 1024,
  /** 5 MB — course thumbnail or user avatar */
  IMAGE: 5 * 1024 * 1024,
} as const
