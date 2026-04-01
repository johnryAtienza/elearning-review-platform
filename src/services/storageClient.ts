/**
 * storageClient.ts — browser-safe upload API
 *
 * Calls the `generate-upload-url` Edge Function to get a presigned PUT URL,
 * then uploads the file directly to R2 using XHR (for progress events).
 * R2 secrets never touch the browser.
 */

import { supabase } from './supabaseClient'
import config from '@/config'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UploadProgressEvent {
  loaded: number
  total: number
  /** 0–100 */
  percent: number
}

export interface StorageUploadResult {
  path: string
  publicUrl: string
}

export type ProgressCallback = (event: UploadProgressEvent) => void

// ── Edge Function URL ─────────────────────────────────────────────────────────

function getEdgeFunctionUrl(): string {
  return `${config.supabase.url}/functions/v1/generate-upload-url`
}

// ── Core upload ───────────────────────────────────────────────────────────────

/**
 * Upload a file to R2 via a presigned URL.
 *
 * 1. Calls the Edge Function with the user's JWT → receives presigned PUT URL
 * 2. PUTs the file directly to R2 with XHR to track upload progress
 * 3. Returns the storage path and public CDN URL
 *
 * @param file       The file (or Blob) to upload
 * @param path       Storage key, e.g. "videos/lessons/lesson-abc.mp4"
 * @param onProgress Optional progress callback
 */
export async function uploadToStorage(
  file: File | Blob,
  path: string,
  onProgress?: ProgressCallback,
): Promise<StorageUploadResult> {
  // ── Step 1: get presigned PUT URL ──────────────────────────────────────────
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const contentType = file instanceof File ? file.type : 'application/octet-stream'

  const res = await fetch(getEdgeFunctionUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ path, contentType }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `Failed to get upload URL (${res.status})`)
  }

  const { uploadUrl, publicUrl } = await res.json() as {
    uploadUrl: string
    publicUrl: string
  }

  // ── Step 2: PUT directly to R2 with progress ───────────────────────────────
  await xhrUpload(file, uploadUrl, contentType, onProgress)

  return { path, publicUrl }
}

function xhrUpload(
  file: File | Blob,
  url: string,
  contentType: string,
  onProgress?: ProgressCallback,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({
          loaded: e.loaded,
          total: e.total,
          percent: Math.round((e.loaded / e.total) * 100),
        })
      }
    })

    xhr.addEventListener('load', () => {
      // R2 returns 200 for successful PUT
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Upload network error')))
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')))

    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.send(file)
  })
}
