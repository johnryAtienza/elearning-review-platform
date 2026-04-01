import { useRef, useState } from 'react'
import { Upload, CheckCircle, XCircle, Loader2, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/button'
import { uploadToStorage, type ProgressCallback, type StorageUploadResult } from '@/services/storageClient'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FileUploadProps {
  /** Storage path for the uploaded file, e.g. "videos/lessons/lesson-abc.mp4" */
  storagePath: string
  /** MIME types the input should accept, e.g. "video/*" or "application/pdf" */
  accept: string
  /** Label shown in the drop zone */
  label: string
  /** Human-readable description of accepted file types */
  hint?: string
  /** Maximum file size in bytes. Default: 500 MB */
  maxBytes?: number
  /** Called once the file is successfully uploaded */
  onUploadComplete: (result: StorageUploadResult) => void
  /** Called if the upload errors out */
  onUploadError?: (error: Error) => void
  /** Called when the user removes the current file selection */
  onRemove?: () => void
  /** Existing URL — renders as already-uploaded when provided */
  existingUrl?: string
  className?: string
}

type UploadState =
  | { status: 'idle' }
  | { status: 'selected'; file: File }
  | { status: 'uploading'; file: File; percent: number }
  | { status: 'done'; file: File; result: StorageUploadResult }
  | { status: 'error'; file: File | null; message: string }

const DEFAULT_MAX_BYTES = 500 * 1024 * 1024 // 500 MB

// ── Component ─────────────────────────────────────────────────────────────────

export function FileUpload({
  storagePath,
  accept,
  label,
  hint,
  maxBytes = DEFAULT_MAX_BYTES,
  onUploadComplete,
  onUploadError,
  onRemove,
  existingUrl,
  className,
}: FileUploadProps) {
  const [state, setState] = useState<UploadState>(
    existingUrl ? { status: 'idle' } : { status: 'idle' },
  )
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── File validation ──────────────────────────────────────────────────────────

  function validateFile(file: File): string | null {
    if (file.size > maxBytes) {
      return `File too large. Maximum size is ${formatBytes(maxBytes)}.`
    }
    return null
  }

  function selectFile(file: File) {
    const error = validateFile(file)
    if (error) {
      setState({ status: 'error', file: null, message: error })
      return
    }
    setState({ status: 'selected', file })
  }

  // ── Upload ───────────────────────────────────────────────────────────────────

  async function startUpload(file: File) {
    setState({ status: 'uploading', file, percent: 0 })

    const onProgress: ProgressCallback = ({ percent }) => {
      setState({ status: 'uploading', file, percent })
    }

    try {
      const result = await uploadToStorage(file, storagePath, onProgress)
      setState({ status: 'done', file, result })
      onUploadComplete(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setState({ status: 'error', file, message: error.message })
      onUploadError?.(error)
    }
  }

  // ── Event handlers ───────────────────────────────────────────────────────────

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) selectFile(file)
    // reset so the same file can be re-selected after removal
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) selectFile(file)
  }

  function handleRemove() {
    setState({ status: 'idle' })
    onRemove?.()
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const isUploading = state.status === 'uploading'

  return (
    <div className={cn('space-y-2', className)}>
      {/* Drop zone — shown when idle or on error */}
      {(state.status === 'idle' || state.status === 'error') && !existingUrl && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'w-full rounded-lg border-2 border-dashed p-8 text-center transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30',
          )}
        >
          <Upload className="mx-auto mb-2 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">{label}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            Drag & drop or click to browse · max {formatBytes(maxBytes)}
          </p>
        </button>
      )}

      {/* File selected — not yet uploading */}
      {state.status === 'selected' && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{state.file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(state.file.size)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                onClick={() => startUpload(state.file)}
              >
                Upload
              </Button>
              <button
                type="button"
                onClick={handleRemove}
                className="rounded p-1 hover:bg-muted"
                aria-label="Remove file"
              >
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uploading — progress bar */}
      {state.status === 'uploading' && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-2">
          <div className="flex items-center gap-3">
            <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{state.file.name}</p>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {state.percent}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-150"
              style={{ width: `${state.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Done */}
      {state.status === 'done' && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <CheckCircle className="size-4 shrink-0 text-green-600 dark:text-green-400" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{state.file.name}</p>
                <p className="text-xs text-muted-foreground">Uploaded successfully</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="rounded p-1 hover:bg-muted"
              aria-label="Remove file"
            >
              <X className="size-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Existing URL (pre-populated) */}
      {existingUrl && state.status === 'idle' && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <CheckCircle className="size-4 shrink-0 text-green-600 dark:text-green-400" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{label} uploaded</p>
                <p className="truncate text-xs text-muted-foreground">{existingUrl}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setState({ status: 'idle' })
                onRemove?.()
              }}
              className="rounded p-1 hover:bg-muted"
              aria-label="Replace file"
            >
              <X className="size-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {state.status === 'error' && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <XCircle className="size-4 shrink-0" />
          {state.message}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
        disabled={isUploading}
        aria-label={label}
      />
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
