import { useState, useEffect, useCallback, type FormEvent } from 'react'
import {
  ClipboardList, Plus, Pencil, Trash2,
  Loader2, BookMarked, Tags,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { QuizModal } from '../../features/admin/components/QuizModal'
import {
  AdminTableHeader, EmptyState, DeleteConfirmRow, ADMIN_ROW_BASE, Tip, LoadError, filterTabClass,
  type ColConfig,
} from '../../features/admin/components/AdminTable'
import {
  getAdminQuizzes,
  getAdminQuizFull,
  deleteAdminQuiz,
  getProblemSetCategories,
  createProblemSetCategory,
  updateProblemSetCategory,
  deleteProblemSetCategory,
  type AdminProblemSetCategory,
  type AdminQuiz,
  type AdminQuizFull,
} from '@s-class/api/admin.service'
import { toast } from '@/lib/toast'

// ── Column layout ─────────────────────────────────────────────────────────────

const GRID_COLS = 'grid-cols-[1fr_10rem_6rem_6rem_5rem_5rem]'

const HEADER_COLS: ColConfig[] = [
  { label: 'Problem Set' },
  { label: 'Category',  smOnly: true },
  { label: 'Questions', center: true, smOnly: true },
  { label: 'Status',    center: true, smOnly: true },
  { label: 'Order',     center: true, smOnly: true },
  { label: 'Actions',   center: true },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type ModalState =
  | { open: false }
  | { open: true; quiz: AdminQuizFull | null; loading: boolean }

type CategoryModalState =
  | { open: false }
  | { open: true; category: AdminProblemSetCategory | null }

type PageTab = 'problemSets' | 'categories'

// ── Page ─────────────────────────────────────────────────────────────────────

export function AdminQuizzesPage() {
  const [quizzes,            setQuizzes]            = useState<AdminQuiz[]>([])
  const [categories,         setCategories]         = useState<AdminProblemSetCategory[]>([])
  const [activeTab,          setActiveTab]          = useState<PageTab>('problemSets')
  const [loading,            setLoading]            = useState(true)
  const [loadError,          setLoadError]          = useState<string | null>(null)
  const [deleting,           setDeleting]           = useState<Set<string>>(new Set())
  const [confirmId,          setConfirmId]          = useState<string | null>(null)
  const [modal,              setModal]              = useState<ModalState>({ open: false })
  const [categoryModal,      setCategoryModal]      = useState<CategoryModalState>({ open: false })
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)
  const [confirmCategoryId,  setConfirmCategoryId]  = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    Promise.all([
      getAdminQuizzes(),
      getProblemSetCategories(),
    ])
      .then(([quizData, categoryData]) => {
        setQuizzes(quizData)
        setCategories(categoryData)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load problem sets.')
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
      toast.error(err, 'Failed to load problem set details.')
      setModal({ open: false })
    }
  }

  async function handleDelete(quiz: AdminQuiz) {
    setDeleting((prev) => new Set(prev).add(quiz.id))
    setConfirmId(null)
    try {
      await deleteAdminQuiz(quiz.id)
      setQuizzes((prev) => prev.filter((q) => q.id !== quiz.id))
      toast.success(`Problem set "${quiz.title}" deleted`)
    } catch (err) {
      toast.error(err, 'Failed to delete problem set.')
    } finally {
      setDeleting((prev) => { const s = new Set(prev); s.delete(quiz.id); return s })
    }
  }

  function handleSaved(_quizId: string, _lessonId: string, isEdit: boolean) {
    setModal({ open: false })
    toast.success(isEdit ? 'Problem set updated' : 'Problem set created')
    Promise.all([getAdminQuizzes(), getProblemSetCategories()])
      .then(([quizData, categoryData]) => {
        setQuizzes(quizData)
        setCategories(categoryData)
      })
      .catch(() => {/* silently ignore refresh failure */})
  }

  async function handleDeleteCategory(category: AdminProblemSetCategory) {
    setDeletingCategoryId(category.id)
    setConfirmCategoryId(null)
    try {
      await deleteProblemSetCategory(category.id)
      setCategories((prev) => prev.filter((item) => item.id !== category.id))
      toast.success(`Category "${category.name}" deleted`)
    } catch (err) {
      toast.error(err, 'Failed to delete category.')
    } finally {
      setDeletingCategoryId(null)
    }
  }

  function handleCategorySaved(isEdit: boolean) {
    setCategoryModal({ open: false })
    toast.success(isEdit ? 'Category updated' : 'Category created')
    Promise.all([getAdminQuizzes(), getProblemSetCategories()])
      .then(([quizData, categoryData]) => {
        setQuizzes(quizData)
        setCategories(categoryData)
      })
      .catch(() => {/* silently ignore refresh failure */})
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Problem Sets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading
              ? 'Loading…'
              : `${quizzes.length} problem set${quizzes.length !== 1 ? 's' : ''} across ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}`}
          </p>
        </div>
        {activeTab === 'problemSets' && (
          <Button
            onClick={() => setModal({ open: true, quiz: null, loading: false })}
            disabled={!loading && categories.length === 0}
            title={categories.length === 0 ? 'Create a category first' : undefined}
          >
            <Plus className="mr-2 size-4" />
            New Problem Set
          </Button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-2" role="tablist" aria-label="Problem set management">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'problemSets'}
          className={filterTabClass(activeTab === 'problemSets')}
          onClick={() => setActiveTab('problemSets')}
        >
          Problem Sets
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'categories'}
          className={filterTabClass(activeTab === 'categories')}
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </button>
      </div>

      {/* ── Load error ── */}
      <LoadError message={loadError} />

      {activeTab === 'categories' ? (
        <ProblemSetCategoriesPanel
          categories={categories}
          loading={loading}
          deletingCategoryId={deletingCategoryId}
          confirmCategoryId={confirmCategoryId}
          onCreate={() => setCategoryModal({ open: true, category: null })}
          onEdit={(category) => setCategoryModal({ open: true, category })}
          onConfirmDelete={(category) => setConfirmCategoryId(category.id)}
          onCancelDelete={() => setConfirmCategoryId(null)}
          onDelete={handleDeleteCategory}
        />
      ) : (
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
              title="No problem sets yet"
              description="Create a problem set and attach it to a lesson."
              action={
                <Button
                  size="sm"
                  onClick={() => setModal({ open: true, quiz: null, loading: false })}
                  disabled={categories.length === 0}
                  title={categories.length === 0 ? 'Create a category first' : undefined}
                >
                  <Plus className="mr-2 size-4" />
                  New Problem Set
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
      )}

      {/* ── Modal ── */}
      {modal.open && (
        modal.loading ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="flex items-center gap-3 rounded-xl border bg-background px-6 py-4 shadow-xl">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-sm font-medium">Loading problem set…</span>
            </div>
          </div>
        ) : (
          <QuizModal
            quiz={modal.quiz}
            categories={categories}
            onClose={() => setModal({ open: false })}
            onSaved={(quizId, lessonId) => handleSaved(quizId, lessonId, modal.quiz !== null)}
          />
        )
      )}

      {categoryModal.open && (
        <ProblemSetCategoryModal
          category={categoryModal.category}
          onClose={() => setCategoryModal({ open: false })}
          onSaved={() => handleCategorySaved(categoryModal.category !== null)}
        />
      )}
    </div>
  )
}

// ── Category management ──────────────────────────────────────────────────────

interface ProblemSetCategoriesPanelProps {
  categories: AdminProblemSetCategory[]
  loading: boolean
  deletingCategoryId: string | null
  confirmCategoryId: string | null
  onCreate: () => void
  onEdit: (category: AdminProblemSetCategory) => void
  onConfirmDelete: (category: AdminProblemSetCategory) => void
  onCancelDelete: () => void
  onDelete: (category: AdminProblemSetCategory) => void
}

function ProblemSetCategoriesPanel({
  categories,
  loading,
  deletingCategoryId,
  confirmCategoryId,
  onCreate,
  onEdit,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
}: ProblemSetCategoriesPanelProps) {
  return (
    <section className="rounded-xl border shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Tags className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Problem Set Categories</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Categories drive the lesson-page tabs and their display order.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onCreate}>
          <Plus className="mr-2 size-4" />
          New Category
        </Button>
      </div>

      {loading ? (
        <div className="divide-y">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-7 w-16 rounded-md" />
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories yet"
          description="Create at least one category before adding problem sets."
          action={
            <Button size="sm" onClick={onCreate}>
              <Plus className="mr-2 size-4" />
              New Category
            </Button>
          }
        />
      ) : (
        <div className="divide-y">
          {categories.map((category) => {
            const isDeleting = deletingCategoryId === category.id
            const isConfirmingDelete = confirmCategoryId === category.id

            return (
              <div key={category.id} className="divide-y">
                <div className="flex items-center gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{category.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="tabular-nums">Order {category.sortOrder}</span>
                      <Badge variant="secondary" className="tabular-nums">
                        {category.problemSetCount} set{category.problemSetCount === 1 ? '' : 's'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    <Tip label="Edit category">
                      <Button
                        variant="ghost" size="icon" className="size-8"
                        disabled={isDeleting} onClick={() => onEdit(category)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </Tip>
                    <Tip label="Delete category" align="right">
                      <Button
                        variant="ghost" size="icon"
                        className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={isDeleting} onClick={() => onConfirmDelete(category)}
                      >
                        {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                      </Button>
                    </Tip>
                  </div>
                </div>

                {isConfirmingDelete && (
                  <DeleteConfirmRow
                    message={
                      <>
                        Delete category <strong>"{category.name}"</strong>? Categories currently used by problem sets cannot be deleted.
                      </>
                    }
                    onConfirm={() => onDelete(category)}
                    onCancel={onCancelDelete}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

interface ProblemSetCategoryModalProps {
  category: AdminProblemSetCategory | null
  onClose: () => void
  onSaved: () => void
}

function ProblemSetCategoryModal({ category, onClose, onSaved }: ProblemSetCategoryModalProps) {
  const isEdit = category !== null
  const [name,      setName]      = useState(category?.name ?? '')
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 40))
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    const numericSortOrder = Number(sortOrder)

    if (!trimmedName) {
      setError('Please enter a category name.')
      return
    }
    if (!Number.isFinite(numericSortOrder)) {
      setError('Sort order must be a number.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (isEdit) {
        await updateProblemSetCategory(category.id, {
          name:      trimmedName,
          sortOrder: numericSortOrder,
        })
      } else {
        await createProblemSetCategory({
          name:      trimmedName,
          sortOrder: numericSortOrder,
        })
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={saving ? undefined : onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-xl border bg-background shadow-xl"
      >
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Category' : 'New Category'}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Category names are used as lesson-page tab labels.
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Category Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Core Problems"
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Sort Order</label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              disabled={saving}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Create category'}
          </Button>
        </div>
      </form>
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

        {/* Problem set info */}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{quiz.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <BookMarked className="size-3 text-muted-foreground/60 shrink-0" />
            <p className="text-xs text-muted-foreground truncate">
              {quiz.lessonTitle} · {quiz.courseTitle}
            </p>
          </div>
        </div>

        {/* Category */}
        <span className="hidden sm:flex items-center min-w-0">
          <Badge variant="outline" className="max-w-full truncate">
            {quiz.categoryName}
          </Badge>
        </span>

        {/* Question count */}
        <span className="hidden sm:flex justify-center">
          <Badge variant="secondary" className="tabular-nums">
            {quiz.questionCount} Q
          </Badge>
        </span>

        {/* Status */}
        <span className="hidden sm:flex justify-center">
          <Badge variant={quiz.status === 'published' ? 'secondary' : 'outline'} className="capitalize">
            {quiz.status}
          </Badge>
        </span>

        {/* Sort order */}
        <span className="hidden sm:block text-xs text-muted-foreground text-center tabular-nums">
          {quiz.sortOrder}
        </span>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1">
          <Tip label="Edit problem set">
            <Button
              variant="ghost" size="icon" className="size-8"
              disabled={isDeleting} onClick={onEdit}
            >
              <Pencil className="size-4" />
            </Button>
          </Tip>
          <Tip label="Delete problem set" align="right">
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
          message={<>Delete problem set <strong>"{quiz.title}"</strong>? This cannot be undone.</>}
          onConfirm={onDelete}
          onCancel={onCancelDelete}
        />
      )}
    </div>
  )
}
