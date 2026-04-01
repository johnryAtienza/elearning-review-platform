import { useState, useEffect, useRef } from 'react'
import { X, Loader2, FileVideo, FileText, CheckCircle2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { uploadToStorage, type ProgressCallback } from '@/services/storageClient'
import { storagePaths } from '@/services/storagePaths'
import {
  createAdminLesson,
  updateAdminLesson,
  getCoursesForSelect,
  type AdminLesson,
  type CourseOption,
} from '@/services/admin.service'
import { UPLOAD_LIMITS } from '@/constants/upload'
import { cn } from '@/utils/cn'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LessonModalProps {
  /** null = create mode, non-null = edit mode */
  lesson: AdminLesson | null
  /** Pre-select a course (used when opening from a course filter view) */
  defaultCourseId?: string
  onClose: () => void
  onSaved: (lesson: AdminLesson) => void
}

type UploadStage = 'idle' | 'creating' | 'video' | 'pdf' | 'finalising'

// ── Component ─────────────────────────────────────────────────────────────────

export function LessonModal({ lesson, defaultCourseId, onClose, onSaved }: LessonModalProps) {
  const isEdit = lesson !== null

  // ── Form state ───────────────────────────────────────────────────────────────
  const [courseId,     setCourseId]     = useState(lesson?.courseId ?? defaultCourseId ?? '')
  const [title,        setTitle]        = useState(lesson?.title ?? '')
  const [order,        setOrder]        = useState<number>(lesson?.order ?? 1)
  const [videoFile,    setVideoFile]    = useState<File | null>(null)
  const [pdfFile,      setPdfFile]      = useState<File | null>(null)

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [courses,      setCourses]      = useState<CourseOption[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [stage,        setStage]        = useState<UploadStage>('idle')
  const [videoProgress, setVideoProgress] = useState(0)
  const [pdfProgress,  setPdfProgress]  = useState(0)
  const [error,        setError]        = useState<string | null>(null)

  // ── Load courses for dropdown ─────────────────────────────────────────────────
  useEffect(() => {
    getCoursesForSelect()
      .then((data) => {
        setCourses(data)
        if (!courseId && data.length > 0) setCourseId(data[0].id)
      })
      .catch(() => setError('Failed to load courses.'))
      .finally(() => setCoursesLoading(false))
  }, [courseId])

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!courseId)    { setError('Please select a course.'); return }
    if (!title.trim()) { setError('Title is required.');    return }

    setSaving(true)
    setError(null)

    try {
      // 1. Create or update the lesson record
      setStage('creating')
      let lessonId = lesson?.id
      if (isEdit) {
        await updateAdminLesson(lesson.id, { courseId, title: title.trim(), order })
      } else {
        lessonId = await createAdminLesson({ courseId, title: title.trim(), order })
      }

      // 2. Upload video (if a file was picked)
      let videoUrl = lesson?.videoUrl ?? null
      if (videoFile && lessonId) {
        setStage('video')
        setVideoProgress(0)
        const ext    = videoFile.name.split('.').pop() ?? 'mp4'
        const path   = storagePaths.lessonVideo(lessonId, ext)
        const onProg: ProgressCallback = ({ percent }) => setVideoProgress(percent)
        const result = await uploadToStorage(videoFile, path, onProg)
        videoUrl = result.path          // store storage key, not public URL
        await updateAdminLesson(lessonId, { videoUrl })
      }

      // 3. Upload PDF (if a file was picked)
      let reviewerPdfUrl = lesson?.reviewerPdfUrl ?? null
      if (pdfFile && lessonId) {
        setStage('pdf')
        setPdfProgress(0)
        const path   = storagePaths.reviewerPdf(lessonId)
        const onProg: ProgressCallback = ({ percent }) => setPdfProgress(percent)
        const result = await uploadToStorage(pdfFile, path, onProg)
        reviewerPdfUrl = result.path    // store storage key, not public URL
        await updateAdminLesson(lessonId, { reviewerPdfUrl })
      }

      setStage('finalising')

      const courseTitle = courses.find((c) => c.id === courseId)?.title ?? lesson?.courseTitle ?? ''
      onSaved({
        id:             lessonId!,
        courseId,
        courseTitle,
        title:          title.trim(),
        order,
        videoUrl,
        reviewerPdfUrl,
        createdAt:      lesson?.createdAt ?? new Date().toISOString(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save lesson.')
    } finally {
      setSaving(false)
      setStage('idle')
    }
  }

  // ── Upload stage label ────────────────────────────────────────────────────────
  function stageLabel(): string {
    switch (stage) {
      case 'creating':   return 'Saving lesson…'
      case 'video':      return `Uploading video… ${videoProgress}%`
      case 'pdf':        return `Uploading PDF… ${pdfProgress}%`
      case 'finalising': return 'Finalising…'
      default:           return isEdit ? 'Save changes' : 'Create lesson'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={saving ? undefined : onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-xl border bg-background shadow-xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Lesson' : 'New Lesson'}
          </h2>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="space-y-5 px-6 py-5">

            {/* Course */}
            <div className="space-y-1.5">
              <label htmlFor="lesson-course" className="text-sm font-medium">
                Course <span className="text-destructive">*</span>
              </label>
              <select
                id="lesson-course"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                disabled={saving || coursesLoading}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {coursesLoading ? (
                  <option>Loading courses…</option>
                ) : courses.length === 0 ? (
                  <option value="">No courses available</option>
                ) : (
                  courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))
                )}
              </select>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label htmlFor="lesson-title" className="text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                id="lesson-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Introduction to Hooks"
                disabled={saving}
              />
            </div>

            {/* Order */}
            <div className="space-y-1.5">
              <label htmlFor="lesson-order" className="text-sm font-medium">
                Order
              </label>
              <Input
                id="lesson-order"
                type="number"
                min={1}
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                disabled={saving}
                className="w-28"
              />
              <p className="text-xs text-muted-foreground">
                Determines the position within the course.
              </p>
            </div>

            {/* Divider */}
            <div className="border-t pt-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                File Uploads
              </p>

              <div className="space-y-4">
                {/* Video upload */}
                <FilePicker
                  label="Lesson Video"
                  icon={FileVideo}
                  accept="video/mp4,video/webm,video/quicktime"
                  maxBytes={UPLOAD_LIMITS.VIDEO}
                  hint="MP4, WebM, MOV · max 2 GB"
                  existingPath={lesson?.videoUrl}
                  file={videoFile}
                  onFile={setVideoFile}
                  uploading={saving && stage === 'video'}
                  progress={videoProgress}
                  done={saving && (stage === 'pdf' || stage === 'finalising') && videoFile !== null}
                  disabled={saving}
                />

                {/* PDF upload */}
                <FilePicker
                  label="Reviewer PDF"
                  icon={FileText}
                  accept="application/pdf"
                  maxBytes={UPLOAD_LIMITS.PDF}
                  hint="PDF · max 50 MB"
                  existingPath={lesson?.reviewerPdfUrl}
                  file={pdfFile}
                  onFile={setPdfFile}
                  uploading={saving && stage === 'pdf'}
                  progress={pdfProgress}
                  done={saving && stage === 'finalising' && pdfFile !== null}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Error */}
            {error && <p className="text-sm text-destructive">{error}</p>}

          </div>

          {/* Footer */}
          <div className="shrink-0 border-t px-6 py-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || coursesLoading}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {stageLabel()}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── FilePicker ────────────────────────────────────────────────────────────────

interface FilePickerProps {
  label: string
  icon: React.ElementType
  accept: string
  maxBytes: number
  hint: string
  existingPath: string | null | undefined
  file: File | null
  onFile: (f: File | null) => void
  uploading: boolean
  progress: number
  done: boolean
  disabled: boolean
}

function FilePicker({
  label, icon: Icon, accept, maxBytes, hint,
  existingPath, file, onFile,
  uploading, progress, done, disabled,
}: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [sizeError, setSizeError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    e.target.value = ''
    if (!picked) return
    if (picked.size > maxBytes) {
      setSizeError(`File too large. Max ${formatBytes(maxBytes)}.`)
      return
    }
    setSizeError(null)
    onFile(picked)
  }

  const hasExisting = Boolean(existingPath)

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>

      {/* Uploading — progress bar */}
      {uploading ? (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-2">
          <div className="flex items-center gap-3">
            <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
            <p className="flex-1 text-sm truncate">{file?.name}</p>
            <span className="text-xs tabular-nums text-muted-foreground">{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

      ) : done ? (
        /* Done — green tick */
        <div className="flex items-center gap-2.5 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 px-4 py-3">
          <CheckCircle2 className="size-4 shrink-0 text-green-600" />
          <p className="text-sm truncate">{file?.name}</p>
          <span className="ml-auto text-xs text-green-600">Uploaded</span>
        </div>

      ) : file ? (
        /* File selected, waiting for submit */
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => onFile(null)}
            className="shrink-0 rounded p-1 hover:bg-muted"
            disabled={disabled}
          >
            <X className="size-3.5 text-muted-foreground" />
          </button>
        </div>

      ) : hasExisting ? (
        /* Existing file uploaded in prior session */
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <CheckCircle2 className="size-4 shrink-0 text-green-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Already uploaded</p>
            <p className="text-xs text-muted-foreground truncate">{existingPath}</p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            disabled={disabled}
          >
            <Upload className="size-3" />
            Replace
          </button>
        </div>

      ) : (
        /* Empty — click to pick */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className={cn(
            'w-full rounded-lg border-2 border-dashed py-6 flex flex-col items-center gap-2 transition-colors',
            'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <Icon className="size-7 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium">Click to select {label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
          </div>
        </button>
      )}

      {sizeError && (
        <p className="text-xs text-destructive">{sizeError}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
