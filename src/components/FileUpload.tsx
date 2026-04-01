/**
 * FileUpload — reusable file upload component for video and PDF files.
 *
 * Two operating modes:
 *
 * 1. Auto-upload mode (storagePath provided):
 *    Upload begins immediately when the user picks or drops a file.
 *    Use `onUploadComplete` to receive the R2 result.
 *
 * 2. Picker mode (no storagePath):
 *    File is validated and surfaced via `onFile` — parent handles upload.
 *    Use this in sequential save flows (e.g. LessonModal) where the
 *    storage path depends on a record ID that doesn't exist yet.
 *
 * Usage — auto-upload:
 *   <FileUpload
 *     storagePath="videos/lessons/abc.mp4"
 *     accept="video/*"
 *     label="Lesson Video"
 *     hint="MP4, WebM · max 2 GB"
 *     maxBytes={UPLOAD_LIMITS.VIDEO}
 *     onUploadComplete={(result) => setVideoUrl(result.path)}
 *   />
 *
 * Usage — picker mode:
 *   <FileUpload
 *     accept="application/pdf"
 *     label="Reviewer PDF"
 *     hint="PDF · max 50 MB"
 *     maxBytes={UPLOAD_LIMITS.PDF}
 *     existingUrl={lesson.reviewerPdfUrl}
 *     onFile={(file) => setPdfFile(file)}
 *   />
 */

import { useRef, useState, useId, useCallback } from 'react'
import {
  FileVideo, FileText, FileIcon,
  Upload, X, Loader2, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import { uploadToStorage, type StorageUploadResult } from '@/services/storageClient'
import { cn } from '@/utils/cn'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FileUploadProps {
  /**
   * R2 storage key for the uploaded file.
   * When provided, upload starts automatically on file selection.
   * When omitted, the component operates in picker mode.
   */
  storagePath?: string
  /** MIME types accepted by the file input, e.g. `"video/mp4,video/webm"` */
  accept: string
  /** Label displayed in the drop zone and file states */
  label: string
  /** Secondary hint line, e.g. `"MP4, WebM · max 2 GB"` */
  hint?: string
  /** Maximum allowed file size in bytes */
  maxBytes?: number
  /**
   * Existing storage path or public URL — renders the "already uploaded" state.
   * Pass `null` to clear the existing file.
   */
  existingUrl?: string | null
  /** Prevent all interaction */
  disabled?: boolean
  /**
   * Auto-upload mode: called when upload finishes, or `null` when removed.
   * Ignored in picker mode.
   */
  onUploadComplete?: (result: StorageUploadResult | null) => void
  /**
   * Picker mode: called with the selected `File` (or `null` when cleared).
   * Not called in auto-upload mode.
   */
  onFile?: (file: File | null) => void
  className?: string
}

type UploadState =
  | { status: 'idle' }
  | { status: 'selected';  file: File }
  | { status: 'uploading'; file: File; percent: number }
  | { status: 'done';      file: File }
  | { status: 'error';     file: File | null; message: string }

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024 * 1024  // 2 GB

// ── Component ─────────────────────────────────────────────────────────────────

export function FileUpload({
  storagePath,
  accept,
  label,
  hint,
  maxBytes = DEFAULT_MAX_BYTES,
  existingUrl,
  disabled = false,
  onUploadComplete,
  onFile,
  className,
}: FileUploadProps) {
  const inputId  = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' })
  const [isDragOver,  setDragOver]    = useState(false)

  // ── Derived ───────────────────────────────────────────────────────────────────

  const hasExisting  = Boolean(existingUrl) && uploadState.status === 'idle'
  const isUploading  = uploadState.status === 'uploading'
  const isInteractive = !disabled && !isUploading

  // ── File validation ───────────────────────────────────────────────────────────

  function validate(file: File): string | null {
    if (maxBytes && file.size > maxBytes) {
      return `File too large — max ${formatBytes(maxBytes)}.`
    }
    return null
  }

  // ── File processing ───────────────────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    const err = validate(file)
    if (err) {
      setUploadState({ status: 'error', file, message: err })
      return
    }

    // Picker mode — surface to parent, stay in selected state
    if (!storagePath) {
      setUploadState({ status: 'selected', file })
      onFile?.(file)
      return
    }

    // Auto-upload mode
    setUploadState({ status: 'uploading', file, percent: 0 })
    try {
      const result = await uploadToStorage(file, storagePath, ({ percent }) => {
        setUploadState({ status: 'uploading', file, percent })
      })
      setUploadState({ status: 'done', file })
      onUploadComplete?.(result)
    } catch (uploadErr) {
      const message = uploadErr instanceof Error ? uploadErr.message : 'Upload failed.'
      setUploadState({ status: 'error', file, message })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storagePath, maxBytes, onFile, onUploadComplete])

  // ── Remove / replace ─────────────────────────────────────────────────────────

  function handleRemove() {
    setUploadState({ status: 'idle' })
    onFile?.(null)
    onUploadComplete?.(null)
  }

  // ── Input change ──────────────────────────────────────────────────────────────

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''    // allow same file to be re-picked after removal
    if (file) processFile(file)
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────────

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault()
    if (isInteractive) setDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (!isInteractive) return
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const dndHandlers = { onDragEnter: handleDragEnter, onDragLeave: handleDragLeave, onDragOver: handleDragOver, onDrop: handleDrop }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className={cn('space-y-1.5', className)}>

      {/* ── Idle / drop zone ── */}
      {uploadState.status === 'idle' && !hasExisting && (
        <label
          htmlFor={inputId}
          {...dndHandlers}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-8 transition-colors',
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/40 hover:bg-muted/20',
            isInteractive ? 'cursor-pointer' : 'pointer-events-none opacity-50',
          )}
        >
          <FileTypeIcon accept={accept} className="size-9 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium">
              {isDragOver ? `Drop ${label} here` : label}
            </p>
            {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isDragOver ? '' : `Drag & drop or click · max ${formatBytes(maxBytes)}`}
            </p>
          </div>
        </label>
      )}

      {/* ── Existing file (pre-populated from DB) ── */}
      {hasExisting && (
        <FileCard
          icon={<FileTypeIcon accept={accept} className="size-4 shrink-0 text-muted-foreground" />}
          primaryText="Already uploaded"
          secondaryText={existingUrl!}
          status="existing"
          dndHandlers={dndHandlers}
          isDragOver={isDragOver}
          actions={
            <>
              <button
                type="button"
                disabled={!isInteractive}
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Upload className="size-3" />
                Replace
              </button>
              <Divider />
              <RemoveButton disabled={!isInteractive} onClick={handleRemove} />
            </>
          }
        />
      )}

      {/* ── File selected (picker mode) ── */}
      {uploadState.status === 'selected' && (
        <FileCard
          icon={<FileTypeIcon accept={accept} className="size-4 shrink-0 text-muted-foreground" />}
          primaryText={uploadState.file.name}
          secondaryText={formatBytes(uploadState.file.size)}
          status="selected"
          actions={<RemoveButton disabled={!isInteractive} onClick={handleRemove} />}
        />
      )}

      {/* ── Uploading ── */}
      {uploadState.status === 'uploading' && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-2.5">
          <div className="flex items-center gap-3">
            <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
            <span className="flex-1 text-sm truncate min-w-0">{uploadState.file.name}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {uploadState.percent}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-150"
              style={{ width: `${uploadState.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Done ── */}
      {uploadState.status === 'done' && (
        <FileCard
          icon={<CheckCircle2 className="size-4 shrink-0 text-green-600 dark:text-green-400" />}
          primaryText={uploadState.file.name}
          secondaryText="Uploaded successfully"
          status="done"
          actions={<RemoveButton disabled={!isInteractive} onClick={handleRemove} />}
        />
      )}

      {/* ── Error ── */}
      {uploadState.status === 'error' && (
        <div className="space-y-2">
          {uploadState.file && (
            <FileCard
              icon={<FileTypeIcon accept={accept} className="size-4 shrink-0 text-muted-foreground" />}
              primaryText={uploadState.file.name}
              secondaryText={formatBytes(uploadState.file.size)}
              status="selected"
              actions={<RemoveButton disabled={!isInteractive} onClick={handleRemove} />}
            />
          )}
          <div className="flex items-start gap-2 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>{uploadState.message}</span>
            {!uploadState.file && (
              <button
                type="button"
                onClick={() => setUploadState({ status: 'idle' })}
                className="ml-auto shrink-0 underline"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="hidden"
        disabled={!isInteractive}
        onChange={handleInputChange}
      />
    </div>
  )
}

// ── FileCard ──────────────────────────────────────────────────────────────────

interface FileCardProps {
  icon: React.ReactNode
  primaryText: string
  secondaryText: string
  status: 'selected' | 'done' | 'existing'
  actions?: React.ReactNode
  dndHandlers?: object
  isDragOver?: boolean
}

function FileCard({ icon, primaryText, secondaryText, status, actions, dndHandlers, isDragOver }: FileCardProps) {
  return (
    <div
      {...dndHandlers}
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
        status === 'done'
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
          : 'bg-muted/30',
        isDragOver && 'ring-2 ring-primary border-primary',
      )}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{primaryText}</p>
        <p
          className={cn(
            'text-xs truncate',
            status === 'done'
              ? 'text-green-600 dark:text-green-400'
              : 'text-muted-foreground',
          )}
        >
          {secondaryText}
        </p>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RemoveButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Remove file"
      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
    >
      <X className="size-3.5" />
    </button>
  )
}

function Divider() {
  return <span className="h-3.5 w-px bg-border" aria-hidden />
}

/**
 * Picks an icon based on the `accept` MIME string.
 * Falls back to a generic file icon.
 */
function FileTypeIcon({ accept, className }: { accept: string; className?: string }) {
  if (accept.includes('video')) return <FileVideo className={className} />
  if (accept.includes('pdf'))   return <FileText  className={className} />
  return <FileIcon className={className} />
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024)             return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024)     return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
