/**
 * storage.service.ts
 *
 * ⚠️  SERVER-SIDE ONLY
 * This file uses process.env and must never be imported by Vite/browser code.
 * Call it exclusively from:
 *   - A Node.js / Express API server
 *   - Supabase Edge Functions
 *   - Next.js API routes / Server Actions
 *
 * Switching from R2 to S3 (or any S3-compatible store) requires only
 * changing the STORAGE_BACKEND env var — no code changes needed.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// ── Types ─────────────────────────────────────────────────────────────────────

export type StorageBackend = 'r2' | 's3'

export interface UploadOptions {
  /** MIME type of the file. Defaults to 'application/octet-stream'. */
  contentType?: string
  /** Arbitrary key-value metadata stored alongside the object. */
  metadata?: Record<string, string>
  /** Set to 'public-read' for publicly accessible objects. */
  acl?: PutObjectCommandInput['ACL']
}

export interface UploadResult {
  /** The storage path (key) the file was stored under. */
  path: string
  /** Public URL — only valid when the bucket/object is publicly accessible. */
  url: string
}

export interface FileMetadata {
  size: number
  contentType: string | undefined
  lastModified: Date | undefined
}

// ── Provider interface ────────────────────────────────────────────────────────
// Every storage backend must implement this contract.
// Add new providers (GCS, Azure Blob, etc.) without touching call sites.

interface IStorageProvider {
  /** Upload a file and return its storage path and public URL. */
  uploadFile(
    file: Buffer | Uint8Array | Blob | ReadableStream,
    path: string,
    options?: UploadOptions,
  ): Promise<UploadResult>

  /**
   * Return the public URL for a stored path.
   * Only call this on publicly accessible objects.
   */
  getFileUrl(path: string): string

  /**
   * Generate a time-limited signed URL for a private object.
   * @param expiresInSeconds Defaults to 3 600 (1 hour).
   */
  generateSignedUrl(path: string, expiresInSeconds?: number): Promise<string>

  /** Permanently delete an object from storage. */
  deleteFile(path: string): Promise<void>

  /** Check whether an object exists and return basic metadata. */
  getMetadata(path: string): Promise<FileMetadata | null>
}

// ── S3-compatible provider ────────────────────────────────────────────────────
// One class handles Cloudflare R2, AWS S3, MinIO, Backblaze B2, etc.
// The only difference between providers is the constructor config.

interface S3ProviderConfig {
  /** Custom endpoint URL for non-AWS providers (R2, MinIO, …). */
  endpoint?: string
  /** AWS region, or "auto" for Cloudflare R2. */
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  /**
   * Public CDN base URL for the bucket (e.g. https://pub-xxx.r2.dev
   * or a custom domain). When set, getFileUrl() uses this instead of
   * constructing an S3 URL.
   */
  publicUrl?: string
}

class S3StorageProvider implements IStorageProvider {
  private readonly client: S3Client
  private readonly config: S3ProviderConfig

  constructor(config: S3ProviderConfig) {
    this.config = config
    this.client = new S3Client({
      region: config.region,
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
      credentials: {
        accessKeyId:     config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // Path-style URLs are required for R2 and most non-AWS S3 providers.
      forcePathStyle: !!config.endpoint,
    })
  }

  async uploadFile(
    file: Buffer | Uint8Array | Blob | ReadableStream,
    path: string,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    const { contentType = 'application/octet-stream', metadata, acl } = options

    await this.client.send(
      new PutObjectCommand({
        Bucket:      this.config.bucketName,
        Key:         path,
        Body:        file as Buffer,
        ContentType: contentType,
        Metadata:    metadata,
        ...(acl ? { ACL: acl } : {}),
      }),
    )

    return { path, url: this.getFileUrl(path) }
  }

  getFileUrl(path: string): string {
    const base = this.config.publicUrl
    if (base) return `${base.replace(/\/$/, '')}/${path}`

    // Cloudflare R2 / custom endpoint — construct path-style URL
    if (this.config.endpoint) {
      return `${this.config.endpoint}/${this.config.bucketName}/${path}`
    }

    // AWS S3 default virtual-hosted URL
    return `https://${this.config.bucketName}.s3.${this.config.region}.amazonaws.com/${path}`
  }

  async generateSignedUrl(path: string, expiresInSeconds = 3_600): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.config.bucketName, Key: path }),
      { expiresIn: expiresInSeconds },
    )
  }

  async deleteFile(path: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.bucketName, Key: path }),
    )
  }

  async getMetadata(path: string): Promise<FileMetadata | null> {
    try {
      const res = await this.client.send(
        new HeadObjectCommand({ Bucket: this.config.bucketName, Key: path }),
      )
      return {
        size:         res.ContentLength ?? 0,
        contentType:  res.ContentType,
        lastModified: res.LastModified,
      }
    } catch {
      return null   // object not found
    }
  }
}

// ── Provider factories ────────────────────────────────────────────────────────

function createR2Provider(): IStorageProvider {
  const accountId        = process.env.R2_ACCOUNT_ID
  const accessKeyId      = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey  = process.env.R2_SECRET_ACCESS_KEY
  const bucketName       = process.env.R2_BUCKET_NAME
  const publicUrl        = process.env.R2_PUBLIC_URL   // optional

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error(
      '[storage] Missing Cloudflare R2 credentials. ' +
      'Ensure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, ' +
      'and R2_BUCKET_NAME are set in your server environment.',
    )
  }

  return new S3StorageProvider({
    endpoint:        `https://${accountId}.r2.cloudflarestorage.com`,
    region:          'auto',
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl,
  })
}

function createS3Provider(): IStorageProvider {
  const region           = process.env.S3_REGION ?? 'us-east-1'
  const accessKeyId      = process.env.S3_ACCESS_KEY_ID
  const secretAccessKey  = process.env.S3_SECRET_ACCESS_KEY
  const bucketName       = process.env.S3_BUCKET_NAME
  const publicUrl        = process.env.S3_PUBLIC_URL   // optional CDN

  if (!accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error(
      '[storage] Missing AWS S3 credentials. ' +
      'Ensure S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and S3_BUCKET_NAME ' +
      'are set in your server environment.',
    )
  }

  return new S3StorageProvider({ region, accessKeyId, secretAccessKey, bucketName, publicUrl })
}

// ── Singleton ─────────────────────────────────────────────────────────────────

const FACTORIES: Record<StorageBackend, () => IStorageProvider> = {
  r2: createR2Provider,
  s3: createS3Provider,
}

let _provider: IStorageProvider | null = null

function getProvider(): IStorageProvider {
  if (_provider) return _provider

  const backend = (process.env.STORAGE_BACKEND ?? 'r2') as StorageBackend
  const factory  = FACTORIES[backend]

  if (!factory) {
    throw new Error(
      `[storage] Unknown STORAGE_BACKEND "${backend}". Valid values: ${Object.keys(FACTORIES).join(', ')}.`,
    )
  }

  _provider = factory()
  return _provider
}

/** Reset the cached provider — useful in tests or when env vars change. */
export function resetStorageProvider(): void {
  _provider = null
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Upload a file to storage.
 *
 * @example
 * const { path, url } = await uploadFile(buffer, 'lessons/abc/video.mp4', {
 *   contentType: 'video/mp4',
 * })
 */
export async function uploadFile(
  file: Buffer | Uint8Array | Blob | ReadableStream,
  path: string,
  options?: UploadOptions,
): Promise<UploadResult> {
  return getProvider().uploadFile(file, path, options)
}

/**
 * Return the public URL for a stored file path.
 * Only use this for objects in a publicly accessible bucket.
 *
 * @example
 * const url = getFileUrl('thumbnails/course-1.webp')
 */
export function getFileUrl(path: string): string {
  return getProvider().getFileUrl(path)
}

/**
 * Generate a short-lived signed URL for a private object.
 * Default expiry: 1 hour (3 600 s). Max for R2: 7 days (604 800 s).
 *
 * @example
 * const signedUrl = await generateSignedUrl('lessons/abc/video.mp4', 7200)
 */
export async function generateSignedUrl(
  path: string,
  expiresInSeconds = 3_600,
): Promise<string> {
  return getProvider().generateSignedUrl(path, expiresInSeconds)
}

/**
 * Delete a file from storage.
 *
 * @example
 * await deleteFile('lessons/abc/video.mp4')
 */
export async function deleteFile(path: string): Promise<void> {
  return getProvider().deleteFile(path)
}

/**
 * Check whether a file exists and return its metadata.
 * Returns null if the object does not exist.
 *
 * @example
 * const meta = await getMetadata('thumbnails/course-1.webp')
 * if (!meta) console.log('file not found')
 */
export async function getMetadata(path: string): Promise<FileMetadata | null> {
  return getProvider().getMetadata(path)
}

// ── Path helpers ──────────────────────────────────────────────────────────────
// Centralise storage key conventions so they're consistent across the codebase.
// If the folder structure changes, update only here.

export const storagePaths = {
  /** e.g. thumbnails/course-abc123.webp */
  courseThumbnail: (courseId: string, ext = 'webp') =>
    `thumbnails/course-${courseId}.${ext}`,

  /** e.g. videos/lessons/lesson-abc123.mp4 */
  lessonVideo: (lessonId: string, ext = 'mp4') =>
    `videos/lessons/lesson-${lessonId}.${ext}`,

  /** e.g. reviewers/lesson-abc123.pdf */
  reviewerPdf: (lessonId: string) =>
    `reviewers/lesson-${lessonId}.pdf`,

  /** e.g. avatars/user-abc123.webp */
  userAvatar: (userId: string, ext = 'webp') =>
    `avatars/user-${userId}.${ext}`,
}
