import { useState, useEffect, useCallback } from 'react'
import {
  BookMarked, Plus, Pencil, Trash2, Loader2,
  FileVideo, FileText, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { LessonModal } from '@/features/admin/components/LessonModal'
import {
  getAdminLessons,
  deleteAdminLesson,
  getCoursesForSelect,
  type AdminLesson,
  type CourseOption,
} from '@/services/admin.service'
import { toast } from '@/lib/toast'

type ModalState =
  | { open: false }
  | { open: true; lesson: AdminLesson | null }

export function AdminLessonsPage() {
  const [lessons,   setLessons]   = useState<AdminLesson[]>([])
  const [courses,   setCourses]   = useState<CourseOption[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter,    setFilter]    = useState<string>('all')
  const [deleting,  setDeleting]  = useState<Set<string>>(new Set())
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [modal,     setModal]     = useState<ModalState>({ open: false })

  // ── Load ─────────────────────────────────────────────────────────────────────
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

  // ── Delete ────────────────────────────────────────────────────────────────────
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

  // ── Modal saved ───────────────────────────────────────────────────────────────
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
      {loadError && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {loadError}
        </div>
      )}

      {/* ── Table ── */}
      <div className="rounded-xl border shadow-sm overflow-hidden">

        {/* Header row */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Lesson</span>
          <span className="hidden sm:block text-center w-16">Order</span>
          <span className="text-center">Video</span>
          <span className="text-center">PDF</span>
          <span className="text-center">Actions</span>
        </div>

        {/* Loading skeletons */}
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
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-3.5 hover:bg-muted/20 transition-colors">

        {/* Title + course */}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{lesson.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className="text-xs font-normal py-0">
              {lesson.courseTitle}
            </Badge>
          </div>
        </div>

        {/* Order */}
        <span className="hidden sm:flex justify-center w-16 text-sm tabular-nums text-muted-foreground">
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
          <Button
            variant="ghost" size="icon" className="size-8"
            title="Edit lesson" disabled={isDeleting} onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Delete lesson" disabled={isDeleting} onClick={onConfirmDelete}
          >
            {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          </Button>
        </div>
      </div>

      {/* Inline delete confirmation */}
      {isConfirmingDelete && (
        <div className="flex items-center justify-between gap-4 border-t border-destructive/20 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">
            Delete <span className="font-semibold">"{lesson.title}"</span>? This cannot be undone.
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
  icon: Icon, title, description, action,
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function filterTabClass(active: boolean): string {
  return [
    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
    active
      ? 'bg-primary text-primary-foreground'
      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
  ].join(' ')
}
