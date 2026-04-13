import { useState, useEffect, useCallback } from 'react'
import {
  BookMarked, Plus, Pencil, Trash2, Loader2,
  FileVideo, FileText, CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { LessonModal } from '@/features/admin/components/LessonModal'
import {
  AdminTableHeader, EmptyState, DeleteConfirmRow, ADMIN_ROW_BASE,
  filterTabClass, Tip, LoadError, type ColConfig,
} from '@/features/admin/components/AdminTable'
import {
  getAdminLessons,
  deleteAdminLesson,
  getCoursesForSelect,
  type AdminLesson,
  type CourseOption,
} from '@/services/admin.service'
import { toast } from '@/lib/toast'

// ── Column layout ─────────────────────────────────────────────────────────────

const GRID_COLS = 'grid-cols-[1fr_4rem_4rem_3.5rem_5rem]'

const HEADER_COLS: ColConfig[] = [
  { label: 'Lesson' },
  { label: 'Order',   center: true, smOnly: true },
  { label: 'Video',   center: true },
  { label: 'PDF',     center: true },
  { label: 'Actions', center: true },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type ModalState =
  | { open: false }
  | { open: true; lesson: AdminLesson | null }

// ── Page ─────────────────────────────────────────────────────────────────────

export function AdminLessonsPage() {
  const [lessons,   setLessons]   = useState<AdminLesson[]>([])
  const [courses,   setCourses]   = useState<CourseOption[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter,    setFilter]    = useState<string>('all')
  const [deleting,  setDeleting]  = useState<Set<string>>(new Set())
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [modal,     setModal]     = useState<ModalState>({ open: false })

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    Promise.all([getAdminLessons(), getCoursesForSelect()])
      .then(([ls, cs]) => { setLessons(ls); setCourses(cs); setLoading(false) })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load lessons.')
        setLoading(false)
      })
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(lesson: AdminLesson) {
    setDeleting((prev) => new Set(prev).add(lesson.id))
    setConfirmId(null)
    try {
      await deleteAdminLesson(lesson.id)
      setLessons((prev) => prev.filter((l) => l.id !== lesson.id))
      toast.success(`"${lesson.title}" deleted`)
    } catch (err) {
      toast.error(err, 'Failed to delete lesson.')
    } finally {
      setDeleting((prev) => { const s = new Set(prev); s.delete(lesson.id); return s })
    }
  }

  function handleSaved(saved: AdminLesson, isEdit: boolean) {
    setLessons((prev) => {
      const exists = prev.some((l) => l.id === saved.id)
      return exists
        ? prev.map((l) => (l.id === saved.id ? saved : l))
        : [...prev, saved].sort((a, b) =>
            a.courseId.localeCompare(b.courseId) || a.order - b.order,
          )
    })
    setModal({ open: false })
    toast.success(isEdit ? `"${saved.title}" updated` : `"${saved.title}" created`)
  }

  const filtered = filter === 'all' ? lessons : lessons.filter((l) => l.courseId === filter)

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lessons</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? 'Loading…' : (
              <>
                {lessons.length} total
                {filter !== 'all' && ` · ${filtered.length} in selected course`}
              </>
            )}
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, lesson: null })}>
          <Plus className="mr-2 size-4" />
          New Lesson
        </Button>
      </div>

      {/* ── Course filter ── */}
      {courses.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setFilter('all')} className={filterTabClass(filter === 'all')}>
            All courses
          </button>
          {courses.map((c) => (
            <button key={c.id} onClick={() => setFilter(c.id)} className={filterTabClass(filter === c.id)}>
              {c.title}
            </button>
          ))}
        </div>
      )}

      {/* ── Load error ── */}
      <LoadError message={loadError} />

      {/* ── Table ── */}
      <div className="rounded-xl border shadow-sm overflow-hidden">
        <AdminTableHeader cols={HEADER_COLS} gridCols={GRID_COLS} />

        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="hidden sm:block h-4 w-6" />
                <Skeleton className="size-4 rounded" />
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-7 w-16 rounded-md" />
              </div>
            ))}
          </div>

        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BookMarked}
            title={filter !== 'all' ? 'No lessons in this course' : 'No lessons yet'}
            description="Create your first lesson to get started."
            action={
              <Button size="sm" onClick={() => setModal({ open: true, lesson: null })}>
                <Plus className="mr-2 size-4" />
                New Lesson
              </Button>
            }
          />

        ) : (
          <div className="divide-y">
            {filtered.map((lesson) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                isDeleting={deleting.has(lesson.id)}
                isConfirmingDelete={confirmId === lesson.id}
                onEdit={() => setModal({ open: true, lesson })}
                onConfirmDelete={() => setConfirmId(lesson.id)}
                onCancelDelete={() => setConfirmId(null)}
                onDelete={() => handleDelete(lesson)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modal.open && (
        <LessonModal
          lesson={modal.lesson}
          defaultCourseId={filter !== 'all' ? filter : undefined}
          onClose={() => setModal({ open: false })}
          onSaved={(saved) => handleSaved(saved, modal.lesson !== null)}
        />
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatLessonDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// ── LessonRow ─────────────────────────────────────────────────────────────────

interface LessonRowProps {
  lesson: AdminLesson
  isDeleting: boolean
  isConfirmingDelete: boolean
  onEdit: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onDelete: () => void
}

function LessonRow({
  lesson, isDeleting, isConfirmingDelete,
  onEdit, onConfirmDelete, onCancelDelete, onDelete,
}: LessonRowProps) {
  return (
    <div className="divide-y">
      <div className={`${ADMIN_ROW_BASE} ${GRID_COLS}`}>

        {/* Title + course */}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{lesson.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className="text-xs font-normal py-0">
              {lesson.courseTitle}
            </Badge>
            {lesson.durationMinutes != null && (
              <span className="text-xs text-muted-foreground">
                {formatLessonDuration(lesson.durationMinutes)}
              </span>
            )}
          </div>
        </div>

        {/* Order */}
        <span className="hidden sm:flex justify-center text-sm tabular-nums text-muted-foreground">
          #{lesson.order}
        </span>

        {/* Video indicator */}
        <span className="flex justify-center" title={lesson.videoUrl ? 'Video uploaded' : 'No video'}>
          {lesson.videoUrl
            ? <CheckCircle2 className="size-4 text-green-600" />
            : <FileVideo className="size-4 text-muted-foreground/30" />}
        </span>

        {/* PDF indicator */}
        <span className="flex justify-center" title={lesson.reviewerPdfUrl ? 'PDF uploaded' : 'No PDF'}>
          {lesson.reviewerPdfUrl
            ? <CheckCircle2 className="size-4 text-green-600" />
            : <FileText className="size-4 text-muted-foreground/30" />}
        </span>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1">
          <Tip label="Edit lesson">
            <Button
              variant="ghost" size="icon" className="size-8"
              disabled={isDeleting} onClick={onEdit}
            >
              <Pencil className="size-4" />
            </Button>
          </Tip>
          <Tip label="Delete lesson" align="right">
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
          message={<>Delete <strong>"{lesson.title}"</strong>? This cannot be undone.</>}
          onConfirm={onDelete}
          onCancel={onCancelDelete}
        />
      )}
    </div>
  )
}
