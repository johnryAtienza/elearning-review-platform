import { useState, useRef } from 'react'
import { X, Upload, ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { uploadToStorage } from '@/services/storageClient'
import { storagePaths } from '@/services/storagePaths'
import {
  createCourse,
  updateCourse,
  type AdminCourse,
} from '@/services/admin.service'
import { UPLOAD_LIMITS } from '@/constants/upload'
import { cn } from '@/utils/cn'

interface CourseModalProps {
  /** null = create mode, non-null = edit mode */
  course: AdminCourse | null
  onClose: () => void
  onSaved: (course: AdminCourse) => void
}

export function CourseModal({ course, onClose, onSaved }: CourseModalProps) {
  const isEdit = course !== null

  const [title,            setTitle]            = useState(course?.title       ?? '')
  const [description,      setDescription]      = useState(course?.description ?? '')
  const [thumbnailFile,    setThumbnailFile]    = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(course?.thumbnailUrl ?? null)
  const [saving,           setSaving]           = useState(false)
  const [uploadProgress,   setUploadProgress]   = useState(0)
  const [error,            setError]            = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

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

    setSaving(true)
    setError(null)

    try {
      // ── 1. Create or update course record ───────────────────────────────────
      let courseId = course?.id
      if (isEdit) {
        await updateCourse(course.id, {
          title:       trimmedTitle,
          description: description.trim(),
        })
      } else {
        courseId = await createCourse({
          title:       trimmedTitle,
          description: description.trim(),
        })
      }

      // ── 2. Upload thumbnail if a new file was picked ─────────────────────
      let thumbnailUrl = course?.thumbnailUrl ?? null
      if (thumbnailFile && courseId) {
        const ext    = thumbnailFile.name.split('.').pop() ?? 'webp'
        const path   = storagePaths.courseThumbnail(courseId, ext)
        const result = await uploadToStorage(thumbnailFile, path, (evt) => {
          setUploadProgress(evt.percent)
        })
        thumbnailUrl = result.publicUrl
        await updateCourse(courseId, { thumbnailUrl })
      }

      onSaved({
        id:           courseId!,
        title:        trimmedTitle,
        description:  description.trim(),
        thumbnailUrl,
        category:     course?.category    ?? '',
        duration:     course?.duration    ?? '',
        isPublished:  course?.isPublished ?? false,
        lessonCount:  course?.lessonCount ?? 0,
        createdAt:    course?.createdAt   ?? new Date().toISOString(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save course.')
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
            {isEdit ? 'Edit Course' : 'New Course'}
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
            <label htmlFor="course-title" className="text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              id="course-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to React"
              disabled={saving}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="course-desc" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="course-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will students learn in this course?"
              rows={3}
              disabled={saving}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
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
              {isEdit ? 'Save changes' : 'Create course'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
