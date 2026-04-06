import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Eye, EyeOff, Loader2, ExternalLink,
  Pencil, Trash2, Plus, AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CourseModal } from '@/features/admin/components/CourseModal'
import { CourseThumbnail } from '@/components/CourseThumbnail'
import {
  getAdminCourses,
  setCoursePublished,
  deleteCourse,
  type AdminCourse,
} from '@/services/admin.service'
import { toast } from '@/lib/toast'
import { ROUTES } from '@/constants/routes'

type ModalState =
  | { open: false }
  | { open: true; course: AdminCourse | null }

export function AdminCoursesPage() {
  const [courses,   setCourses]   = useState<AdminCourse[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toggling,  setToggling]  = useState<Set<string>>(new Set())
  const [deleting,  setDeleting]  = useState<Set<string>>(new Set())
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [modal,     setModal]     = useState<ModalState>({ open: false })

  // ── Load ─────────────────────────────────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    getAdminCourses()
      .then((data) => { setCourses(data); setLoading(false) })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load courses.')
        setLoading(false)
      })
  }, [])

  useEffect(() => { load() }, [load])

  // ── Publish toggle ────────────────────────────────────────────────────────────
  async function handleTogglePublished(course: AdminCourse) {
    setToggling((prev) => new Set(prev).add(course.id))
    const next = !course.isPublished
    try {
      await setCoursePublished(course.id, next)
      setCourses((prev) =>
        prev.map((c) => c.id === course.id ? { ...c, isPublished: next } : c),
      )
      toast.success(next ? `"${course.title}" published` : `"${course.title}" moved to draft`)
    } catch (err) {
      toast.error(err, 'Failed to update course.')
    } finally {
      setToggling((prev) => { const s = new Set(prev); s.delete(course.id); return s })
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  async function handleDelete(course: AdminCourse) {
    setDeleting((prev) => new Set(prev).add(course.id))
    setConfirmId(null)
    try {
      await deleteCourse(course.id)
      setCourses((prev) => prev.filter((c) => c.id !== course.id))
      toast.success(`"${course.title}" deleted`)
    } catch (err) {
      toast.error(err, 'Failed to delete course.')
    } finally {
      setDeleting((prev) => { const s = new Set(prev); s.delete(course.id); return s })
    }
  }

  // ── Modal saved ───────────────────────────────────────────────────────────────
  function handleSaved(saved: AdminCourse, isEdit: boolean) {
    setCourses((prev) => {
      const exists = prev.some((c) => c.id === saved.id)
      return exists
        ? prev.map((c) => c.id === saved.id ? saved : c)
        : [saved, ...prev]
    })
    setModal({ open: false })
    toast.success(isEdit ? `"${saved.title}" updated` : `"${saved.title}" created`)
  }

  const publishedCount = courses.filter((c) => c.isPublished).length

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? 'Loading…' : `${courses.length} total · ${publishedCount} published`}
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, course: null })}>
          <Plus className="mr-2 size-4" />
          New Course
        </Button>
      </div>

      {/* ── Load error ── */}
      {loadError && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {loadError}
        </div>
      )}

      {/* ── Table ── */}
      <div className="rounded-xl border shadow-sm overflow-hidden">

        {/* Header row */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="hidden sm:block w-12">Thumb</span>
          <span>Course</span>
          <span className="hidden sm:block text-center">Lessons</span>
          <span className="text-center">Status</span>
          <span className="text-center">Actions</span>
        </div>

        {/* Loading skeletons */}
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <Skeleton className="hidden sm:block size-10 rounded-md shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="hidden sm:block h-4 w-6" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-7 w-20 rounded-md" />
              </div>
            ))}
          </div>

        ) : courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses yet"
            description="Create your first course to get started."
            action={
              <Button size="sm" onClick={() => setModal({ open: true, course: null })}>
                <Plus className="mr-2 size-4" />
                New Course
              </Button>
            }
          />

        ) : (
          <div className="divide-y">
            {courses.map((course) => (
              <CourseRow
                key={course.id}
                course={course}
                isToggling={toggling.has(course.id)}
                isDeleting={deleting.has(course.id)}
                isConfirmingDelete={confirmId === course.id}
                onEdit={() => setModal({ open: true, course })}
                onTogglePublished={() => handleTogglePublished(course)}
                onConfirmDelete={() => setConfirmId(course.id)}
                onCancelDelete={() => setConfirmId(null)}
                onDelete={() => handleDelete(course)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modal.open && (
        <CourseModal
          course={modal.course}
          onClose={() => setModal({ open: false })}
          onSaved={(saved) => handleSaved(saved, modal.course !== null)}
        />
      )}
    </div>
  )
}

// ── CourseRow ─────────────────────────────────────────────────────────────────

interface CourseRowProps {
  course: AdminCourse
  isToggling: boolean
  isDeleting: boolean
  isConfirmingDelete: boolean
  onEdit: () => void
  onTogglePublished: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onDelete: () => void
}

function CourseRow({
  course, isToggling, isDeleting, isConfirmingDelete,
  onEdit, onTogglePublished, onConfirmDelete, onCancelDelete, onDelete,
}: CourseRowProps) {
  return (
    <div className="divide-y">
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-4 py-3.5 hover:bg-muted/20 transition-colors">

        {/* Thumbnail */}
        <div className="hidden sm:block w-12 shrink-0">
          <CourseThumbnail
            src={course.thumbnailUrl}
            alt={course.title}
            className="size-10 rounded-md border"
          />
        </div>

        {/* Title + description */}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{course.title}</p>
          {course.description ? (
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-sm">
              {course.description}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/40 mt-0.5 italic">No description</p>
          )}
        </div>

        {/* Lesson count */}
        <span className="hidden sm:flex justify-center min-w-12 text-sm tabular-nums text-muted-foreground">
          {course.lessonCount}
        </span>

        {/* Status badge */}
        <span className="flex justify-center">
          {course.isPublished ? (
            <Badge variant="success">Published</Badge>
          ) : (
            <Badge variant="secondary">Draft</Badge>
          )}
        </span>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost" size="icon" className="size-8"
            title={course.isPublished ? 'Unpublish' : 'Publish'}
            disabled={isToggling || isDeleting}
            onClick={onTogglePublished}
          >
            {isToggling ? (
              <Loader2 className="size-4 animate-spin" />
            ) : course.isPublished ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </Button>
          <Button
            variant="ghost" size="icon" className="size-8"
            title="Edit course" disabled={isDeleting} onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost" size="icon" className="size-8"
            title="View on site" disabled={isDeleting} asChild
          >
            <Link to={ROUTES.COURSE(course.id)}>
              <ExternalLink className="size-4" />
            </Link>
          </Button>
          <Button
            variant="ghost" size="icon"
            className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Delete course" disabled={isDeleting} onClick={onConfirmDelete}
          >
            {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          </Button>
        </div>
      </div>

      {/* Inline delete confirmation */}
      {isConfirmingDelete && (
        <div className="flex items-center justify-between gap-4 bg-destructive/5 px-4 py-3 border-t border-destructive/20">
          <p className="text-sm text-destructive">
            Delete <span className="font-semibold">"{course.title}"</span>? This cannot be undone.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={onCancelDelete}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={onDelete}>Delete</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted/60">
        <Icon className="size-7 text-muted-foreground/60" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      {action}
    </div>
  )
}
