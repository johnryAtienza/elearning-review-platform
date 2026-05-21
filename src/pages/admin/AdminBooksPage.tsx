import { useState, useEffect, useCallback } from 'react'
import {
  BookOpen, Eye, EyeOff, Loader2,
  Pencil, Trash2, Plus, ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BookModal } from '@/features/admin/components/BookModal'
import {
  AdminTableHeader, EmptyState, DeleteConfirmRow, ADMIN_ROW_BASE, Tip, LoadError,
  type ColConfig,
} from '@/features/admin/components/AdminTable'
import {
  getAdminBooks,
  setBookStatus,
  deleteAdminBook,
  type AdminBook,
} from '@/services/admin.service'
import { toast } from '@/lib/toast'
import { formatPHP } from '@/utils/money'

const GRID_COLS = 'grid-cols-[3rem_1fr_5rem_5rem_6rem_9rem]'

const HEADER_COLS: ColConfig[] = [
  { label: 'Cover',   smOnly: true },
  { label: 'Book' },
  { label: 'Stock',   center: true, smOnly: true },
  { label: 'Price',   center: true },
  { label: 'Status',  center: true },
  { label: 'Actions', center: true },
]

type ModalState =
  | { open: false }
  | { open: true; book: AdminBook | null }

export function AdminBooksPage() {
  const [books,     setBooks]     = useState<AdminBook[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toggling,  setToggling]  = useState<Set<string>>(new Set())
  const [deleting,  setDeleting]  = useState<Set<string>>(new Set())
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [modal,     setModal]     = useState<ModalState>({ open: false })

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    getAdminBooks()
      .then((data) => { setBooks(data); setLoading(false) })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load books.')
        setLoading(false)
      })
  }, [])

  useEffect(() => { load() }, [load])

  async function handleTogglePublished(book: AdminBook) {
    setToggling((prev) => new Set(prev).add(book.id))
    const next = book.status === 'published' ? 'draft' : 'published'
    try {
      await setBookStatus(book.id, next)
      setBooks((prev) =>
        prev.map((b) => b.id === book.id ? { ...b, status: next } : b),
      )
      toast.success(next === 'published' ? `"${book.title}" published` : `"${book.title}" moved to draft`)
    } catch (err) {
      toast.error(err, 'Failed to update book.')
    } finally {
      setToggling((prev) => { const s = new Set(prev); s.delete(book.id); return s })
    }
  }

  async function handleDelete(book: AdminBook) {
    setDeleting((prev) => new Set(prev).add(book.id))
    setConfirmId(null)
    try {
      await deleteAdminBook(book.id)
      setBooks((prev) => prev.filter((b) => b.id !== book.id))
      toast.success(`"${book.title}" deleted`)
    } catch (err) {
      toast.error(err, 'Failed to delete book.')
    } finally {
      setDeleting((prev) => { const s = new Set(prev); s.delete(book.id); return s })
    }
  }

  function handleSaved(saved: AdminBook, isEdit: boolean) {
    setBooks((prev) => {
      const exists = prev.some((b) => b.id === saved.id)
      return exists
        ? prev.map((b) => b.id === saved.id ? saved : b)
        : [saved, ...prev]
    })
    setModal({ open: false })
    toast.success(isEdit ? `"${saved.title}" updated` : `"${saved.title}" created`)
  }

  const publishedCount = books.filter((b) => b.status === 'published').length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Books</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? 'Loading…' : `${books.length} total · ${publishedCount} published`}
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, book: null })}>
          <Plus className="mr-2 size-4" />
          New Book
        </Button>
      </div>

      <LoadError message={loadError} />

      {/* Table */}
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
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-7 w-20 rounded-md" />
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No books yet"
            description="Add your first book to start selling."
            action={
              <Button size="sm" onClick={() => setModal({ open: true, book: null })}>
                <Plus className="mr-2 size-4" />
                New Book
              </Button>
            }
          />
        ) : (
          <div className="divide-y">
            {books.map((book) => (
              <BookRow
                key={book.id}
                book={book}
                isToggling={toggling.has(book.id)}
                isDeleting={deleting.has(book.id)}
                isConfirmingDelete={confirmId === book.id}
                onEdit={() => setModal({ open: true, book })}
                onTogglePublished={() => handleTogglePublished(book)}
                onConfirmDelete={() => setConfirmId(book.id)}
                onCancelDelete={() => setConfirmId(null)}
                onDelete={() => handleDelete(book)}
              />
            ))}
          </div>
        )}
      </div>

      {modal.open && (
        <BookModal
          book={modal.book}
          onClose={() => setModal({ open: false })}
          onSaved={(saved) => handleSaved(saved, modal.book !== null)}
        />
      )}
    </div>
  )
}

interface BookRowProps {
  book: AdminBook
  isToggling: boolean
  isDeleting: boolean
  isConfirmingDelete: boolean
  onEdit: () => void
  onTogglePublished: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onDelete: () => void
}

function BookRow({
  book, isToggling, isDeleting, isConfirmingDelete,
  onEdit, onTogglePublished, onConfirmDelete, onCancelDelete, onDelete,
}: BookRowProps) {
  return (
    <div className="divide-y">
      <div className={`${ADMIN_ROW_BASE} ${GRID_COLS}`}>

        {/* Cover */}
        <div className="hidden sm:flex w-12 shrink-0">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="size-10 rounded-md border object-cover bg-muted"
            />
          ) : (
            <div className="size-10 rounded-md border bg-muted flex items-center justify-center">
              <ImageIcon className="size-5 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Title + author */}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{book.title}</p>
          {book.author ? (
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-sm">
              by {book.author}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/40 mt-0.5 italic">No author</p>
          )}
        </div>

        {/* Stock */}
        <span className={`hidden sm:flex justify-center text-sm tabular-nums ${book.stock === 0 ? 'text-warning font-semibold' : 'text-muted-foreground'}`}>
          {book.stock}
        </span>

        {/* Price */}
        <span className="flex justify-center text-sm font-semibold tabular-nums">
          {formatPHP(book.priceCentavos)}
        </span>

        {/* Status badge */}
        <span className="flex justify-center">
          {book.status === 'published' ? (
            <Badge variant="success">Published</Badge>
          ) : book.status === 'archived' ? (
            <Badge variant="outline">Archived</Badge>
          ) : (
            <Badge variant="secondary">Draft</Badge>
          )}
        </span>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1">
          <Tip label={book.status === 'published' ? 'Unpublish' : 'Publish'}>
            <Button
              variant="ghost" size="icon" className="size-8"
              disabled={isToggling || isDeleting}
              onClick={onTogglePublished}
            >
              {isToggling
                ? <Loader2 className="size-4 animate-spin" />
                : book.status === 'published'
                  ? <EyeOff className="size-4" />
                  : <Eye className="size-4" />}
            </Button>
          </Tip>
          <Tip label="Edit book">
            <Button
              variant="ghost" size="icon" className="size-8"
              disabled={isDeleting} onClick={onEdit}
            >
              <Pencil className="size-4" />
            </Button>
          </Tip>
          <Tip label="Delete book" align="right">
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
          message={<>Delete <strong>"{book.title}"</strong>? Books with existing orders cannot be deleted.</>}
          onConfirm={onDelete}
          onCancel={onCancelDelete}
        />
      )}
    </div>
  )
}
