import { useState, useRef, useEffect } from 'react'
import { X, Upload, ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { uploadToStorage } from '@s-class/api/storageClient'
import { storagePaths } from '@s-class/api/storagePaths'
import {
  createSubject,
  updateSubject,
  type AdminSubject,
} from '@s-class/api/admin.service'
import { getAllCourses } from '@s-class/api/coursesApi'
import { UPLOAD_LIMITS } from '@/constants/upload'
import { cn } from '@/utils/cn'
import type { Course } from '../../../features/courses/types'

interface SubjectModalProps {
  /** null = create mode, non-null = edit mode */
  subject: AdminSubject | null
  onClose: () => void
  onSaved: (subject: AdminSubject) => void
}

export function SubjectModal({ subject, onClose, onSaved }: SubjectModalProps) {
  const isEdit = subject !== null

  const [title,            setTitle]            = useState(subject?.title       ?? '')
  const [description,      setDescription]      = useState(subject?.description ?? '')
  const [courseId,         setCourseIdState]    = useState<string>(subject?.courseId ?? '')
  const [sortOrder,        setSortOrder]        = useState<number>(subject?.sortOrder ?? 0)
  const [thumbnailFile,    setThumbnailFile]    = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(subject?.thumbnailUrl ?? null)
  const [saving,           setSaving]           = useState(false)
  const [uploadProgress,   setUploadProgress]   = useState(0)
  const [error,            setError]            = useState<string | null>(null)
  const [courses,          setCourses]          = useState<Course[]>([])
  const [coursesLoading,   setCoursesLoading]   = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load parent courses for the dropdown
  useEffect(() => {
    getAllCourses()
      .then(setCourses)
      .catch(() => { /* silently fail — admin can still save without a course */ })
      .finally(() => setCoursesLoading(false))
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > UPLOAD_LIMITS.IMAGE) {
      setError('Image must be under 5 MB.')
      return
    }
    setThumbnailFile(file)
    setThumbnailPreview(URL.createObjectURL(file))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) { setError('Title is required.'); return }
    if (!Number.isInteger(sortOrder)) { setError('Order must be a whole number.'); return }

    setSaving(true)
    setError(null)

    try {
      const chosenCourseId = courseId || null

      // ── 1. Create or update subject record ──────────────────────────────────
      let subjectId = subject?.id
      if (isEdit) {
        await updateSubject(subject.id, {
          title:       trimmedTitle,
          description: description.trim(),
          courseId:    chosenCourseId,
          sortOrder,
        })
      } else {
        subjectId = await createSubject({
          title:       trimmedTitle,
          description: description.trim(),
          courseId:    chosenCourseId,
          sortOrder,
        })
      }

      // ── 2. Upload thumbnail if a new file was picked ─────────────────────
      let thumbnailUrl = subject?.thumbnailUrl ?? null
      if (thumbnailFile && subjectId) {
        const ext    = thumbnailFile.name.split('.').pop() ?? 'webp'
        // storagePaths.courseThumbnail key shape is `thumbnails/course-${id}.${ext}`.
        // The R2 path template is intentionally unchanged — existing objects use
        // these keys; renaming would require an R2 migration outside this phase.
        const path   = storagePaths.courseThumbnail(subjectId, ext)
        const result = await uploadToStorage(thumbnailFile, path, (evt) => {
          setUploadProgress(evt.percent)
        })
        thumbnailUrl = result.publicUrl
        await updateSubject(subjectId, { thumbnailUrl })
      }

      const selectedCourse = courses.find((c) => c.id === chosenCourseId)

      onSaved({
        id:           subjectId!,
        title:        trimmedTitle,
        description:  description.trim(),
        thumbnailUrl,
        category:     selectedCourse?.name ?? subject?.category ?? '',
        courseId:     chosenCourseId,
        duration:     subject?.duration    ?? '',
        isPublished:  subject?.isPublished ?? false,
        lessonCount:  subject?.lessonCount ?? 0,
        createdAt:    subject?.createdAt   ?? new Date().toISOString(),
        sortOrder,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save subject.')
    } finally {
      setSaving(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-xl border bg-background shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Subject' : 'New Subject'}
          </h2>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">

          {/* Thumbnail picker */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Thumbnail</label>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              className={cn(
                'relative flex h-36 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors',
                thumbnailPreview
                  ? 'border-transparent'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50',
              )}
            >
              {thumbnailPreview ? (
                <>
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="absolute inset-0 size-full object-cover"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                    <Upload className="size-5 text-white" />
                    <span className="text-xs font-medium text-white">Change image</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImageIcon className="size-8" />
                  <p className="text-center text-xs">
                    Click to upload
                    <br />
                    <span className="text-muted-foreground/60">JPG, PNG, WebP · max 5 MB</span>
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="subject-title" className="text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              id="subject-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to React"
              disabled={saving}
            />
          </div>

          {/* Order */}
          <div className="space-y-1.5">
            <label htmlFor="subject-order" className="text-sm font-medium">
              Order
            </label>
            <Input
              id="subject-order"
              type="number"
              min={0}
              step={1}
              value={sortOrder}
              onChange={(e) => setSortOrder(Math.max(0, Number(e.target.value) || 0))}
              disabled={saving}
              className="w-28 text-center"
            />
            <p className="text-xs text-muted-foreground">
              Lower numbers appear first in subject menus and listings.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="subject-desc" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="subject-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will students learn in this subject?"
              rows={3}
              disabled={saving}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Parent Course */}
          <div className="space-y-1.5">
            <label htmlFor="subject-course" className="text-sm font-medium">
              Course
            </label>
            {coursesLoading ? (
              <div className="h-9 rounded-md border bg-muted animate-pulse" />
            ) : courses.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No courses yet.{' '}
                <a href="/admin/categories" className="underline hover:text-foreground">
                  Create one first.
                </a>
              </p>
            ) : (
              <select
                id="subject-course"
                value={courseId}
                onChange={(e) => setCourseIdState(e.target.value)}
                disabled={saving}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">— No course —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Upload progress bar */}
          {saving && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading thumbnail…</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create subject'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
