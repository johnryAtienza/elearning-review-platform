/**
 * ImageUpload — reusable image upload component
 *
 * Handles drag & drop, file picking, preview, and upload to R2.
 * The upload is triggered immediately on file selection.
 *
 * Usage:
 *   <ImageUpload
 *     value={thumbnailUrl}
 *     storagePath={storagePaths.courseThumbnail(courseId)}
 *     onChange={(url) => setThumbnailUrl(url)}
 *   />
 */

import { useRef, useState, useCallback, useId } from 'react'
import { ImageIcon, Upload, X, Loader2, AlertTriangle } from 'lucide-react'
import { uploadToStorage } from '@/services/storageClient'
import { UPLOAD_LIMITS } from '@/constants/upload'
import { cn } from '@/utils/cn'

// ── Types ─────────────────────────────────────────────────────────────────────

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; percent: number }
  | { status: 'error'; message: string }

export interface ImageUploadProps {
  /** Current public image URL (from DB or after upload). `null` means no image. */
  value: string | null
  /**
   * R2 storage key to upload to, e.g. `"thumbnails/course-abc.webp"`.
   * Must be provided before the user picks a file.
   */
  storagePath: string
  /** Called with the new public URL after upload, or `null` when removed. */
  onChange: (publicUrl: string | null) => void
  /** Prevent interaction while a parent form is saving. */
  disabled?: boolean
  /** Maximum file size in bytes. Defaults to `UPLOAD_LIMITS.IMAGE` (5 MB). */
  maxBytes?: number
  /** Human-readable label shown in the drop zone, e.g. `"course thumbnail"`. */
  label?: string
  /** Reduces height for use inside tight layouts (e.g. quiz option rows). */
  compact?: boolean
  className?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ImageUpload({
  value,
  storagePath,
  onChange,
  disabled = false,
  maxBytes = UPLOAD_LIMITS.IMAGE,
  label = 'image',
  compact = false,
  className,
}: ImageUploadProps) {
  const inputRef   = useRef<HTMLInputElement>(null)
  const inputId    = useId()
  const [upload,   setUpload]   = useState<UploadState>({ status: 'idle' })
  const [isDragOver, setDragOver] = useState(false)

  // ── File processing ──────────────────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUpload({ status: 'error', message: 'Only image files are accepted.' })
      return
    }
    if (file.size > maxBytes) {
      setUpload({
        status: 'error',
        message: `File too large. Max ${(maxBytes / 1024 / 1024).toFixed(0)} MB.`,
      })
      return
    }

    setUpload({ status: 'uploading', percent: 0 })

    try {
      const result = await uploadToStorage(file, storagePath, ({ percent }) => {
        setUpload({ status: 'uploading', percent })
      })
      setUpload({ status: 'idle' })
      onChange(result.publicUrl)
    } catch (err) {
      setUpload({
        status: 'error',
        message: err instanceof Error ? err.message : 'Upload failed.',
      })
    }
  }, [maxBytes, storagePath, onChange])

  // ── Input handler ─────────────────────────────────────────────────────────────

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''          // allow re-picking the same file
    if (file) processFile(file)
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────────

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault()
    if (!disabled && upload.status !== 'uploading') setDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear if leaving the component root (not a child element)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (disabled || upload.status === 'uploading') return
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  // ── Remove ────────────────────────────────────────────────────────────────────

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    setUpload({ status: 'idle' })
    onChange(null)
  }

  // ── Derived ───────────────────────────────────────────────────────────────────

  const isUploading  = upload.status === 'uploading'
  const isError      = upload.status === 'error'
  const isInteractive = !disabled && !isUploading
  const percent      = isUploading ? upload.percent : 0

  // ── Render: has image ─────────────────────────────────────────────────────────

  if (value || isUploading) {
    return (
      <div className={cn('space-y-1', className)}>
        <div
          className={cn(
            'relative overflow-hidden rounded-lg border bg-muted/20',
            compact ? 'h-20' : 'h-44',
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Image preview */}
          {value && (
            <img
              src={value}
              alt={label}
              className="size-full object-cover"
            />
          )}

          {/* Uploading overlay */}
          {isUploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-[2px]">
              <Loader2 className="size-6 animate-spin text-white" />
              <span className="text-xs font-medium text-white">{percent}%</span>
              {/* Progress bar */}
              <div className="w-24 h-1 rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all duration-150"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Hover overlay (replace / remove) — hidden during upload */}
          {!isUploading && (
            <div
              className={cn(
                'absolute inset-0 flex items-center justify-center gap-2',
                'bg-black/50 transition-opacity',
                isDragOver
                  ? 'opacity-100 ring-2 ring-inset ring-primary'
                  : 'opacity-0 hover:opacity-100',
              )}
            >
              {isDragOver ? (
                <span className="text-sm font-medium text-white">Drop to replace</span>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={!isInteractive}
                    onClick={() => inputRef.current?.click()}
                    className="flex items-center gap-1 rounded bg-white/90 px-2.5 py-1.5 text-xs font-medium text-black hover:bg-white transition-colors"
                  >
                    <Upload className="size-3" />
                    Replace
                  </button>
                  <button
                    type="button"
                    disabled={!isInteractive}
                    onClick={handleRemove}
                    className="flex items-center gap-1 rounded bg-white/90 px-2.5 py-1.5 text-xs font-medium text-black hover:bg-white transition-colors"
                  >
                    <X className="size-3" />
                    Remove
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {isError && <ErrorMessage message={upload.message} />}

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={!isInteractive}
          onChange={handleInputChange}
        />
      </div>
    )
  }

  // ── Render: empty drop zone ───────────────────────────────────────────────────

  return (
    <div className={cn('space-y-1', className)}>
      <label
        htmlFor={inputId}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors',
          compact ? 'py-4' : 'py-10',
          isDragOver
            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
            : 'border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/20',
          isInteractive ? 'cursor-pointer' : 'pointer-events-none opacity-50',
        )}
      >
        <ImageIcon
          className={cn(
            'text-muted-foreground',
            isDragOver ? 'text-primary' : '',
            compact ? 'size-5' : 'size-8',
          )}
        />
        <div className="text-center">
          <p className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>
            {isDragOver ? 'Drop to upload' : `Upload ${label}`}
          </p>
          {!compact && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Drag & drop or click · Max {(maxBytes / 1024 / 1024).toFixed(0)} MB
            </p>
          )}
        </div>
      </label>

      {isError && <ErrorMessage message={upload.message} />}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={!isInteractive}
        onChange={handleInputChange}
      />
    </div>
  )
}

// ── ErrorMessage ──────────────────────────────────────────────────────────────

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-destructive">
      <AlertTriangle className="size-3 shrink-0" />
      {message}
    </div>
  )
}
