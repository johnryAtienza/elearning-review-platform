import { useState } from 'react'
import { storagePaths } from '@/services/storagePaths'
import { updateLessonFiles } from '../services/lessonUploadService'
import { UPLOAD_LIMITS } from '@/constants/upload'
import { FileUpload } from './FileUpload'
import type { StorageUploadResult } from '@/services/storageClient'

export interface LessonUploadFormProps {
  lessonId: string
  initialVideoPath?: string
  initialPdfPath?: string
  onSaved?: (data: { videoPath?: string; pdfPath?: string }) => void
}

export function LessonUploadForm({
  lessonId,
  initialVideoPath,
  initialPdfPath,
  onSaved,
}: LessonUploadFormProps) {
  const [videoPath, setVideoPath] = useState(initialVideoPath)
  const [pdfPath,   setPdfPath]   = useState(initialPdfPath)
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved,     setSaved]     = useState(false)

  async function persist(update: { videoPath?: string; pdfPath?: string }) {
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      await updateLessonFiles(lessonId, update)
      setSaved(true)
      onSaved?.(update)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  function handleVideoUploaded(result: StorageUploadResult) {
    setVideoPath(result.path)
    void persist({ videoPath: result.path })
  }

  function handlePdfUploaded(result: StorageUploadResult) {
    setPdfPath(result.path)
    void persist({ pdfPath: result.path })
  }

  function handleVideoRemoved() {
    setVideoPath(undefined)
    void persist({ videoPath: '' })
  }

  function handlePdfRemoved() {
    setPdfPath(undefined)
    void persist({ pdfPath: '' })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-semibold">Lesson Video</label>
        <FileUpload
          storagePath={storagePaths.lessonVideo(lessonId)}
          accept="video/*"
          label="Upload lesson video"
          hint="MP4, MOV, WebM"
          maxBytes={UPLOAD_LIMITS.VIDEO}
          existingUrl={videoPath}
          onUploadComplete={handleVideoUploaded}
          onRemove={handleVideoRemoved}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold">Reviewer / Study Guide (PDF)</label>
        <FileUpload
          storagePath={storagePaths.reviewerPdf(lessonId)}
          accept="application/pdf"
          label="Upload PDF"
          hint="PDF only"
          maxBytes={UPLOAD_LIMITS.PDF}
          existingUrl={pdfPath}
          onUploadComplete={handlePdfUploaded}
          onRemove={handlePdfRemoved}
        />
      </div>

      {saving    && <p className="text-xs text-muted-foreground">Saving to database…</p>}
      {saveError && <p className="text-xs text-destructive">Failed to save: {saveError}</p>}
      {saved && !saving && !saveError && (
        <p className="text-xs text-green-600 dark:text-green-400">Saved successfully.</p>
      )}
    </div>
  )
}
