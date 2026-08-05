import { useState, useEffect, useMemo, useRef } from 'react'
import { X, Loader2, FileVideo, CheckCircle2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { uploadToStorage, type ProgressCallback } from '@s-class/api/storageClient'
import { storagePaths } from '@s-class/api/storagePaths'
import {
  createAdminLesson,
  updateAdminLesson,
  getSubjectsForSelect,
  getMaxLessonOrderInSubject,
  type AdminLesson,
  type SubjectOption,
} from '@s-class/api/admin.service'
import { UPLOAD_LIMITS } from '@/constants/upload'
import { cn } from '@/utils/cn'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LessonModalProps {
  /** null = create mode, non-null = edit mode */
  lesson: AdminLesson | null
  /** Loaded admin lessons, used to validate curriculum slots before submit. */
  existingLessons: AdminLesson[]
  /** Pre-select a course (used when opening from a course filter view) */
  defaultCourseId?: string
  onClose: () => void
  onSaved: (lesson: AdminLesson) => void
}

type UploadStage = 'idle' | 'creating' | 'video' | 'finalising'

const MAX_LESSON_DAYS_PER_WEEK = 6

function lessonWeekFullMessage(weekNumber: number): string {
  return `This subject already has ${MAX_LESSON_DAYS_PER_WEEK} days for Week ${weekNumber}. Delete or move an existing lesson before adding another day.`
}

function duplicateSlotMessage(weekNumber: number, dayNumber: number): string {
  return `Week ${weekNumber}, Day ${dayNumber} is already used for this subject. Choose another day or move the existing lesson first.`
}

function getLessonSlotValidationError(params: {
  lessons: AdminLesson[]
  currentLessonId: string | null
  originalSlot: { courseId: string; weekNumber: number; dayNumber: number } | null
  courseId: string
  weekNumber: number
  dayNumber: number
}): string | null {
  const { lessons, currentLessonId, originalSlot, courseId, weekNumber, dayNumber } = params
  if (!courseId) return null

  const isUnchangedExistingSlot =
    originalSlot !== null &&
    courseId === originalSlot.courseId &&
    weekNumber === originalSlot.weekNumber &&
    dayNumber === originalSlot.dayNumber

  if (isUnchangedExistingSlot) return null

  const otherLessons = lessons.filter((existing) => existing.id !== currentLessonId)
  const duplicateSlot = otherLessons.some((existing) =>
    existing.courseId === courseId &&
    existing.weekNumber === weekNumber &&
    existing.dayNumber === dayNumber
  )

  if (duplicateSlot) return duplicateSlotMessage(weekNumber, dayNumber)

  const lessonsInWeek = otherLessons.filter((existing) =>
    existing.courseId === courseId &&
    existing.weekNumber === weekNumber
  )

  if (lessonsInWeek.length >= MAX_LESSON_DAYS_PER_WEEK) {
    return lessonWeekFullMessage(weekNumber)
  }

  return null
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LessonModal({ lesson, existingLessons, defaultCourseId, onClose, onSaved }: LessonModalProps) {
  const isEdit = lesson !== null

  // ── Form state ───────────────────────────────────────────────────────────────
  const [courseId,     setCourseId]     = useState(lesson?.courseId ?? defaultCourseId ?? '')
  const [title,        setTitle]        = useState(lesson?.title ?? '')
  const originalCourseId = useRef(lesson?.courseId ?? defaultCourseId ?? '')
  const originalOrder    = useRef(lesson?.order ?? 1)

  // Curriculum slot. Defaults derive from `order` using the wireframe's
  // 6-day week pattern (week = ceil(order/6), day = order). Admin can override.
  const defaultWeek = lesson?.weekNumber ?? Math.max(1, Math.ceil((lesson?.order ?? 1) / 6))
  const defaultDay  = lesson?.dayNumber  ?? (lesson?.order ?? 1)
  const originalSlot = useRef(lesson
    ? { courseId: lesson.courseId, weekNumber: defaultWeek, dayNumber: defaultDay }
    : null)
  const [weekNumber, setWeekNumber] = useState<number>(defaultWeek)
  const [dayNumber,  setDayNumber]  = useState<number>(defaultDay)
  // Free preview unlocks the lesson for guests and free-tier users. Defaults
  // to existing flag when editing; on create, mirrors the post-migration
  // backfill (Day 1 = free preview) so new courses keep the legacy convention
  // without admins needing to remember to tick the box.
  const [isFreePreview, setIsFreePreview] = useState<boolean>(
    lesson?.isFreePreview ?? defaultDay === 1,
  )

  const [durationHrs,  setDurationHrs]  = useState<number>(Math.floor((lesson?.durationMinutes ?? 0) / 60))
  const [durationMins, setDurationMins] = useState<number>((lesson?.durationMinutes ?? 0) % 60)
  const [videoFile,    setVideoFile]    = useState<File | null>(null)

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [courses,      setCourses]      = useState<SubjectOption[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [stage,        setStage]        = useState<UploadStage>('idle')
  const [videoProgress, setVideoProgress] = useState(0)
  const [error,        setError]        = useState<string | null>(null)

  const slotValidationError = useMemo(() => getLessonSlotValidationError({
    lessons: existingLessons,
    currentLessonId: lesson?.id ?? null,
    originalSlot: originalSlot.current,
    courseId,
    weekNumber,
    dayNumber,
  }), [courseId, dayNumber, existingLessons, lesson?.id, weekNumber])
  const saveDisabled = saving || coursesLoading || Boolean(slotValidationError)
  const submitError = error === slotValidationError ? null : error

  // ── Load courses for dropdown (runs once on mount) ───────────────────────────
  useEffect(() => {
    getSubjectsForSelect()
      .then((data) => {
        setCourses(data)
        // Auto-select first course only if no course was pre-selected
        if (!originalCourseId.current && data.length > 0) setCourseId(data[0].id)
      })
      .catch(() => setError('Failed to load courses.'))
      .finally(() => setCoursesLoading(false))
  }, [])

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return                   // guard against double-submit
    if (!courseId)    { setError('Please select a course.'); return }
    if (!title.trim()) { setError('Title is required.');    return }
    const submitSlotError = getLessonSlotValidationError({
      lessons: existingLessons,
      currentLessonId: lesson?.id ?? null,
      originalSlot: originalSlot.current,
      courseId,
      weekNumber,
      dayNumber,
    })
    if (submitSlotError) {
      setError(submitSlotError)
      return
    }

    setSaving(true)
    setError(null)

    try {
      // 1. Create or update the lesson record
      setStage('creating')
      const durationMinutes = durationHrs * 60 + durationMins || null
      let lessonId = lesson?.id
      const subjectChanged = isEdit && courseId !== originalCourseId.current
      const order = (!isEdit || subjectChanged)
        ? await getMaxLessonOrderInSubject(courseId) + 1
        : originalOrder.current

      if (isEdit) {
        await updateAdminLesson(lesson.id, {
          courseId,
          title: title.trim(),
          ...(subjectChanged ? { order } : {}),
          weekNumber,
          dayNumber,
          isFreePreview,
          durationMinutes,
        })
      } else {
        lessonId = await createAdminLesson({ courseId, title: title.trim(), order, weekNumber, dayNumber, isFreePreview, durationMinutes })
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

      setStage('finalising')

      const courseTitle = courses.find((c) => c.id === courseId)?.title ?? lesson?.courseTitle ?? ''
      onSaved({
        id:              lessonId!,
        courseId,
        courseTitle,
        title:           title.trim(),
        order,
        weekNumber,
        dayNumber,
        isFreePreview,
        durationMinutes: durationMinutes,
        videoUrl,
        reviewerPdfUrl: lesson?.reviewerPdfUrl ?? null,
        drmProvider: lesson?.drmProvider ?? null,
        drmAssetId: lesson?.drmAssetId ?? null,
        drmEnabled: lesson?.drmEnabled ?? false,
        drmProcessingStatus: lesson?.drmProcessingStatus ?? 'legacy',
        drmLastProcessingError: lesson?.drmLastProcessingError ?? null,
        createdAt:       lesson?.createdAt ?? new Date().toISOString(),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('lesson_week_full')) {
        setError(lessonWeekFullMessage(weekNumber))
      } else if (msg.includes('lesson_duplicate_curriculum_slot')) {
        setError(duplicateSlotMessage(weekNumber, dayNumber))
      } else if (msg.includes('23505') || msg.includes('duplicate key') || msg.includes('lessons_course_id_order_key') || msg.includes('lessons_subject_id_order_key')) {
        setError('Another lesson was assigned the same position in this subject. Please save again.')
      } else {
        setError(msg || 'Failed to save lesson.')
      }
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
                Subject <span className="text-destructive">*</span>
              </label>
              <select
                id="lesson-course"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                disabled={saving || coursesLoading}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {coursesLoading ? (
                  <option>Loading subjects…</option>
                ) : courses.length === 0 ? (
                  <option value="">No subjects available</option>
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

            {/* Week + Day (curriculum slot) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Curriculum slot</label>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <label htmlFor="lesson-week" className="text-xs text-muted-foreground">Week</label>
                  <Input
                    id="lesson-week"
                    type="number"
                    min={1}
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(Math.max(1, Number(e.target.value) || 1))}
                    disabled={saving}
                    className="w-24 text-center"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="lesson-day" className="text-xs text-muted-foreground">Day</label>
                  <Input
                    id="lesson-day"
                    type="number"
                    min={1}
                    value={dayNumber}
                    onChange={(e) => setDayNumber(Math.max(1, Number(e.target.value) || 1))}
                    disabled={saving}
                    className="w-24 text-center"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Lesson order is assigned automatically. Week + Day drive the
                curriculum grid on the subject page.
              </p>
              {slotValidationError && (
                <p className="text-xs text-destructive">{slotValidationError}</p>
              )}
            </div>

            {/* Free preview toggle */}
            <div className="space-y-1.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 rounded border-input"
                  checked={isFreePreview}
                  onChange={(e) => setIsFreePreview(e.target.checked)}
                  disabled={saving}
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">Free preview</span>
                  <span className="block text-xs text-muted-foreground">
                    Guests and free-tier users can watch this lesson in full
                    without enrolling. Use sparingly to drive conversion.
                  </span>
                </span>
              </label>
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Duration</label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Input
                    id="lesson-duration-hrs"
                    type="number"
                    min={0}
                    max={23}
                    value={durationHrs}
                    onChange={(e) => setDurationHrs(Math.max(0, Math.min(23, Number(e.target.value))))}
                    disabled={saving}
                    className="w-20 text-center"
                  />
                  <span className="text-sm text-muted-foreground">hr</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    id="lesson-duration-mins"
                    type="number"
                    min={0}
                    max={59}
                    value={durationMins}
                    onChange={(e) => setDurationMins(Math.max(0, Math.min(59, Number(e.target.value))))}
                    disabled={saving}
                    className="w-20 text-center"
                  />
                  <span className="text-sm text-muted-foreground">min</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Shown to students on the subject page. Leave at 0 to hide.
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
                  done={saving && stage === 'finalising' && videoFile !== null}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Error */}
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}

          </div>

          {/* Footer */}
          <div className="shrink-0 border-t px-6 py-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveDisabled}>
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
        <div className="flex items-center gap-2.5 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
          <CheckCircle2 className="size-4 shrink-0 text-success" />
          <p className="text-sm truncate">{file?.name}</p>
          <span className="ml-auto text-xs text-success">Uploaded</span>
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
          <CheckCircle2 className="size-4 shrink-0 text-success" />
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
