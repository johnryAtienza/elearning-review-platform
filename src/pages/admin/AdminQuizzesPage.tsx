import { useState, useEffect, useCallback } from 'react'
import {
  ClipboardList, Plus, Pencil, Trash2,
  Loader2, AlertTriangle, BookMarked,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { QuizModal } from '@/features/admin/components/QuizModal'
import {
  AdminTableHeader, EmptyState, DeleteConfirmRow, ADMIN_ROW_BASE,
  type ColConfig,
} from '@/features/admin/components/AdminTable'
import {
  getAdminQuizzes,
  getAdminQuizFull,
  deleteAdminQuiz,
  type AdminQuiz,
  type AdminQuizFull,
} from '@/services/admin.service'
import { toast } from '@/lib/toast'

// ── Column layout ─────────────────────────────────────────────────────────────

const GRID_COLS = 'grid-cols-[1fr_6rem_7rem_5rem]'

const HEADER_COLS: ColConfig[] = [
  { label: 'Lesson' },
  { label: 'Questions', center: true, smOnly: true },
  { label: 'Created',   center: true, smOnly: true },
  { label: 'Actions',   center: true },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type ModalState =
  | { open: false }
  | { open: true; quiz: AdminQuizFull | null; loading: boolean }

// ── Page ─────────────────────────────────────────────────────────────────────

export function AdminQuizzesPage() {
  const [quizzes,   setQuizzes]   = useState<AdminQuiz[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deleting,  setDeleting]  = useState<Set<string>>(new Set())
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [modal,     setModal]     = useState<ModalState>({ open: false })

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    getAdminQuizzes()
      .then((data) => { setQuizzes(data); setLoading(false) })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load quizzes.')
        setLoading(false)
      })
  }, [])

  useEffect(() => { load() }, [load])

  async function handleEdit(quiz: AdminQuiz) {
    setModal({ open: true, quiz: null, loading: true })
    try {
      const full = await getAdminQuizFull(quiz.id)
      setModal({ open: true, quiz: full, loading: false })
    } catch (err) {
      toast.error(err, 'Failed to load quiz details.')
      setModal({ open: false })
    }
  }

  async function handleDelete(quiz: AdminQuiz) {
    setDeleting((prev) => new Set(prev).add(quiz.id))
    setConfirmId(null)
    try {
      await deleteAdminQuiz(quiz.id)
      setQuizzes((prev) => prev.filter((q) => q.id !== quiz.id))
      toast.success(`Quiz for "${quiz.lessonTitle}" deleted`)
    } catch (err) {
      toast.error(err, 'Failed to delete quiz.')
    } finally {
      setDeleting((prev) => { const s = new Set(prev); s.delete(quiz.id); return s })
    }
  }

  function handleSaved(_quizId: string, _lessonId: string, isEdit: boolean) {
    setModal({ open: false })
    toast.success(isEdit ? 'Quiz updated' : 'Quiz created')
    getAdminQuizzes()
      .then(setQuizzes)
      .catch(() => {/* silently ignore refresh failure */})
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quizzes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? 'Loading…' : `${quizzes.length} quiz${quizzes.length !== 1 ? 'zes' : ''} across all lessons`}
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, quiz: null, loading: false })}>
          <Plus className="mr-2 size-4" />
          New Quiz
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
        <AdminTableHeader cols={HEADER_COLS} gridCols={GRID_COLS} />

        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-8 rounded-full hidden sm:block" />
                <Skeleton className="h-4 w-20 hidden sm:block" />
                <Skeleton className="h-7 w-16 rounded-md" />
              </div>
            ))}
          </div>

        ) : quizzes.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No quizzes yet"
            description="Create a quiz and attach it to a lesson."
            action={
              <Button size="sm" onClick={() => setModal({ open: true, quiz: null, loading: false })}>
                <Plus className="mr-2 size-4" />
                New Quiz
              </Button>
            }
          />

        ) : (
          <div className="divide-y">
            {quizzes.map((quiz) => (
              <QuizRow
                key={quiz.id}
                quiz={quiz}
                isDeleting={deleting.has(quiz.id)}
                isConfirmingDelete={confirmId === quiz.id}
                onEdit={() => handleEdit(quiz)}
                onConfirmDelete={() => setConfirmId(quiz.id)}
                onCancelDelete={() => setConfirmId(null)}
                onDelete={() => handleDelete(quiz)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modal.open && (
        modal.loading ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="flex items-center gap-3 rounded-xl border bg-background px-6 py-4 shadow-xl">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-sm font-medium">Loading quiz…</span>
            </div>
          </div>
        ) : (
          <QuizModal
            quiz={modal.quiz}
            onClose={() => setModal({ open: false })}
            onSaved={(quizId, lessonId) => handleSaved(quizId, lessonId, modal.quiz !== null)}
          />
        )
      )}
    </div>
  )
}

// ── QuizRow ───────────────────────────────────────────────────────────────────

interface QuizRowProps {
  quiz: AdminQuiz
  isDeleting: boolean
  isConfirmingDelete: boolean
  onEdit: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onDelete: () => void
}

function QuizRow({
  quiz, isDeleting, isConfirmingDelete,
  onEdit, onConfirmDelete, onCancelDelete, onDelete,
}: QuizRowProps) {
  return (
    <div className="divide-y">
      <div className={`${ADMIN_ROW_BASE} ${GRID_COLS}`}>

        {/* Lesson info */}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{quiz.lessonTitle}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <BookMarked className="size-3 text-muted-foreground/60 shrink-0" />
            <p className="text-xs text-muted-foreground truncate">{quiz.courseTitle}</p>
          </div>
        </div>

        {/* Question count */}
        <span className="hidden sm:flex justify-center">
          <Badge variant="secondary" className="tabular-nums">
            {quiz.questionCount} Q
          </Badge>
        </span>

        {/* Created date */}
        <span className="hidden sm:block text-xs text-muted-foreground text-center tabular-nums">
          {formatDate(quiz.createdAt)}
        </span>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost" size="icon" className="size-8"
            title="Edit quiz" disabled={isDeleting} onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Delete quiz" disabled={isDeleting} onClick={onConfirmDelete}
          >
            {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          </Button>
        </div>
      </div>

      {isConfirmingDelete && (
        <DeleteConfirmRow
          message={<>Delete quiz for <strong>"{quiz.lessonTitle}"</strong>? This cannot be undone.</>}
          onConfirm={onDelete}
          onCancel={onCancelDelete}
        />
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
