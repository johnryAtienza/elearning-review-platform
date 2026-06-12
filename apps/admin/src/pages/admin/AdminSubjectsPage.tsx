import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Eye, EyeOff, Loader2, ExternalLink,
  Pencil, Trash2, Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SubjectModal } from '../../features/admin/components/SubjectModal'
import { SubjectThumbnail } from '@/components/SubjectThumbnail'
import {
  AdminTableHeader, EmptyState, DeleteConfirmRow, ADMIN_ROW_BASE, Tip, LoadError,
  type ColConfig,
} from '../../features/admin/components/AdminTable'
import {
  getAdminSubjects,
  setSubjectPublished,
  deleteSubject,
  type AdminSubject,
} from '@s-class/api/admin.service'
import { toast } from '@/lib/toast'
import { ROUTES } from '@/constants/routes'

// ── Column layout (single source of truth for header + rows) ──────────────────

const GRID_COLS = 'grid-cols-[3rem_1fr_4rem_6rem_9rem]'

const HEADER_COLS: ColConfig[] = [
  { label: 'Thumb',   smOnly: true },
  { label: 'Subject' },
  { label: 'Lessons', center: true, smOnly: true },
  { label: 'Status',  center: true },
  { label: 'Actions', center: true },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type ModalState =
  | { open: false }
  | { open: true; subject: AdminSubject | null }

// ── Page ─────────────────────────────────────────────────────────────────────

export function AdminSubjectsPage() {
  const [subjects,  setSubjects]  = useState<AdminSubject[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toggling,  setToggling]  = useState<Set<string>>(new Set())
  const [deleting,  setDeleting]  = useState<Set<string>>(new Set())
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [modal,     setModal]     = useState<ModalState>({ open: false })

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    getAdminSubjects()
      .then((data) => { setSubjects(data); setLoading(false) })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load subjects.')
        setLoading(false)
      })
  }, [])

  useEffect(() => { load() }, [load])

  async function handleTogglePublished(subject: AdminSubject) {
    setToggling((prev) => new Set(prev).add(subject.id))
    const next = !subject.isPublished
    try {
      await setSubjectPublished(subject.id, next)
      setSubjects((prev) =>
        prev.map((s) => s.id === subject.id ? { ...s, isPublished: next } : s),
      )
      toast.success(next ? `"${subject.title}" published` : `"${subject.title}" moved to draft`)
    } catch (err) {
      toast.error(err, 'Failed to update subject.')
    } finally {
      setToggling((prev) => { const s = new Set(prev); s.delete(subject.id); return s })
    }
  }

  async function handleDelete(subject: AdminSubject) {
    setDeleting((prev) => new Set(prev).add(subject.id))
    setConfirmId(null)
    try {
      await deleteSubject(subject.id)
      setSubjects((prev) => prev.filter((s) => s.id !== subject.id))
      toast.success(`"${subject.title}" deleted`)
    } catch (err) {
      toast.error(err, 'Failed to delete subject.')
    } finally {
      setDeleting((prev) => { const s = new Set(prev); s.delete(subject.id); return s })
    }
  }

  function handleSaved(saved: AdminSubject, isEdit: boolean) {
    setSubjects((prev) => {
      const exists = prev.some((s) => s.id === saved.id)
      return exists
        ? prev.map((s) => s.id === saved.id ? saved : s)
        : [saved, ...prev]
    })
    setModal({ open: false })
    toast.success(isEdit ? `"${saved.title}" updated` : `"${saved.title}" created`)
  }

  const publishedCount = subjects.filter((s) => s.isPublished).length

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subjects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? 'Loading…' : `${subjects.length} total · ${publishedCount} published`}
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, subject: null })}>
          <Plus className="mr-2 size-4" />
          New Subject
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

        ) : subjects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No subjects yet"
            description="Create your first subject to get started."
            action={
              <Button size="sm" onClick={() => setModal({ open: true, subject: null })}>
                <Plus className="mr-2 size-4" />
                New Subject
              </Button>
            }
          />

        ) : (
          <div className="divide-y">
            {subjects.map((subject) => (
              <SubjectRow
                key={subject.id}
                subject={subject}
                isToggling={toggling.has(subject.id)}
                isDeleting={deleting.has(subject.id)}
                isConfirmingDelete={confirmId === subject.id}
                onEdit={() => setModal({ open: true, subject })}
                onTogglePublished={() => handleTogglePublished(subject)}
                onConfirmDelete={() => setConfirmId(subject.id)}
                onCancelDelete={() => setConfirmId(null)}
                onDelete={() => handleDelete(subject)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modal.open && (
        <SubjectModal
          subject={modal.subject}
          onClose={() => setModal({ open: false })}
          onSaved={(saved) => handleSaved(saved, modal.subject !== null)}
        />
      )}
    </div>
  )
}

// ── SubjectRow ────────────────────────────────────────────────────────────────

interface SubjectRowProps {
  subject: AdminSubject
  isToggling: boolean
  isDeleting: boolean
  isConfirmingDelete: boolean
  onEdit: () => void
  onTogglePublished: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onDelete: () => void
}

function SubjectRow({
  subject, isToggling, isDeleting, isConfirmingDelete,
  onEdit, onTogglePublished, onConfirmDelete, onCancelDelete, onDelete,
}: SubjectRowProps) {
  return (
    <div className="divide-y">
      <div className={`${ADMIN_ROW_BASE} ${GRID_COLS}`}>

        {/* Thumbnail */}
        <div className="hidden sm:block w-12 shrink-0">
          <SubjectThumbnail
            src={subject.thumbnailUrl}
            alt={subject.title}
            className="size-10 rounded-md border"
          />
        </div>

        {/* Title + description */}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{subject.title}</p>
          {subject.description ? (
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-sm">
              {subject.description}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/40 mt-0.5 italic">No description</p>
          )}
        </div>

        {/* Lesson count */}
        <span className="hidden sm:flex justify-center text-sm tabular-nums text-muted-foreground">
          {subject.lessonCount}
        </span>

        {/* Status badge */}
        <span className="flex justify-center">
          {subject.isPublished ? (
            <Badge variant="success">Published</Badge>
          ) : (
            <Badge variant="secondary">Draft</Badge>
          )}
        </span>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1">
          <Tip label={subject.isPublished ? 'Unpublish' : 'Publish'}>
            <Button
              variant="ghost" size="icon" className="size-8"
              disabled={isToggling || isDeleting}
              onClick={onTogglePublished}
            >
              {isToggling
                ? <Loader2 className="size-4 animate-spin" />
                : subject.isPublished
                  ? <EyeOff className="size-4" />
                  : <Eye className="size-4" />}
            </Button>
          </Tip>
          <Tip label="Edit subject">
            <Button
              variant="ghost" size="icon" className="size-8"
              disabled={isDeleting} onClick={onEdit}
            >
              <Pencil className="size-4" />
            </Button>
          </Tip>
          <Tip label={subject.isPublished ? 'View on site' : 'Preview draft'}>
            <Button
              variant="ghost" size="icon" className="size-8"
              disabled={isDeleting} asChild
            >
              <Link to={ROUTES.ADMIN_SUBJECT_PREVIEW(subject.id)} target="_blank" rel="noopener noreferrer">
                <ExternalLink className={`size-4 ${!subject.isPublished ? 'text-warning' : ''}`} />
              </Link>
            </Button>
          </Tip>
          <Tip label="Delete subject" align="right">
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
          message={<>Delete <strong>"{subject.title}"</strong>? This cannot be undone.</>}
          onConfirm={onDelete}
          onCancel={onCancelDelete}
        />
      )}
    </div>
  )
}
