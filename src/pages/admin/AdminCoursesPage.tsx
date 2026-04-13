import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Eye, EyeOff, Loader2, ExternalLink,
  Pencil, Trash2, Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CourseModal } from '@/features/admin/components/CourseModal'
import { CourseThumbnail } from '@/components/CourseThumbnail'
import {
  AdminTableHeader, EmptyState, DeleteConfirmRow, ADMIN_ROW_BASE, Tip, LoadError,
  type ColConfig,
} from '@/features/admin/components/AdminTable'
import {
  getAdminCourses,
  setCoursePublished,
  deleteCourse,
  type AdminCourse,
} from '@/services/admin.service'
import { toast } from '@/lib/toast'
import { ROUTES } from '@/constants/routes'

// ── Column layout (single source of truth for header + rows) ──────────────────

const GRID_COLS = 'grid-cols-[3rem_1fr_4rem_6rem_9rem]'

const HEADER_COLS: ColConfig[] = [
  { label: 'Thumb',   smOnly: true },
  { label: 'Course' },
  { label: 'Lessons', center: true, smOnly: true },
  { label: 'Status',  center: true },
  { label: 'Actions', center: true },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type ModalState =
  | { open: false }
  | { open: true; course: AdminCourse | null }

// ── Page ─────────────────────────────────────────────────────────────────────

export function AdminCoursesPage() {
  const [courses,   setCourses]   = useState<AdminCourse[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toggling,  setToggling]  = useState<Set<string>>(new Set())
  const [deleting,  setDeleting]  = useState<Set<string>>(new Set())
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [modal,     setModal]     = useState<ModalState>({ open: false })

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
      <LoadError message={loadError} />

      {/* ── Table ── */}
      <div className="rounded-xl border shadow-sm overflow-hidden">
        <AdminTableHeader cols={HEADER_COLS} gridCols={GRID_COLS} />

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
      <div className={`${ADMIN_ROW_BASE} ${GRID_COLS}`}>

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
        <span className="hidden sm:flex justify-center text-sm tabular-nums text-muted-foreground">
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
          <Tip label={course.isPublished ? 'Unpublish' : 'Publish'}>
            <Button
              variant="ghost" size="icon" className="size-8"
              disabled={isToggling || isDeleting}
              onClick={onTogglePublished}
            >
              {isToggling
                ? <Loader2 className="size-4 animate-spin" />
                : course.isPublished
                  ? <EyeOff className="size-4" />
                  : <Eye className="size-4" />}
            </Button>
          </Tip>
          <Tip label="Edit course">
            <Button
              variant="ghost" size="icon" className="size-8"
              disabled={isDeleting} onClick={onEdit}
            >
              <Pencil className="size-4" />
            </Button>
          </Tip>
          <Tip label={course.isPublished ? 'View on site' : 'Preview draft'}>
            <Button
              variant="ghost" size="icon" className="size-8"
              disabled={isDeleting} asChild
            >
              <Link to={ROUTES.COURSE(course.id)} target="_blank" rel="noopener noreferrer">
                <ExternalLink className={`size-4 ${!course.isPublished ? 'text-amber-500' : ''}`} />
              </Link>
            </Button>
          </Tip>
          <Tip label="Delete course" align="right">
            <Button
              variant="ghost" size="icon"
              className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={isDeleting} onClick={onConfirmDelete}
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </Button>
          </Tip>
        </div>
      </div>

      {isConfirmingDelete && (
        <DeleteConfirmRow
          message={<>Delete <strong>"{course.title}"</strong>? This cannot be undone.</>}
          onConfirm={onDelete}
          onCancel={onCancelDelete}
        />
      )}
    </div>
  )
}

