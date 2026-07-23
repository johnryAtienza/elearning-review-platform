import { useState, useEffect, useCallback, useRef, type ElementType, type FormEvent } from 'react'
import {
  ClipboardList, Plus, Pencil, Trash2,
  Loader2, BookMarked, Tags, List, Folder, GraduationCap, X,
  Search, Check, ChevronsUpDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/cn'
import { QuizModal } from '../../features/admin/components/QuizModal'
import {
  AdminTableHeader, AdminTableSearch, EmptyState, DeleteConfirmRow, ADMIN_ROW_BASE, Tip, LoadError,
  DestructiveConfirmModal,
  matchesAdminSearch,
  type ColConfig,
} from '../../features/admin/components/AdminTable'
import {
  getAdminQuizzes,
  getAdminQuizFull,
  getAdminLessons,
  deleteAdminQuiz,
  getProblemSetCategories,
  createProblemSetCategory,
  updateProblemSetCategory,
  deleteProblemSetCategory,
  getAdminScoringTemplates,
  saveAdminScoringTemplate,
  deleteAdminScoringTemplate,
  type AdminProblemSetCategory,
  type AdminQuiz,
  type AdminQuizFull,
  type AdminScoringTemplate,
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

const SCORING_GRID_COLS = 'grid-cols-[1fr_7rem_16rem_5rem]'

const SCORING_HEADER_COLS: ColConfig[] = [
  { label: 'Template' },
  { label: 'Max',     center: true, smOnly: true },
  { label: 'Bands',   smOnly: true },
  { label: 'Actions', center: true },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type ModalState =
  | { open: false }
  | { open: true; quiz: AdminQuizFull | null; loading: boolean }

type CategoryModalState =
  | { open: false }
  | { open: true; category: AdminProblemSetCategory | null }

type ScoringModalState =
  | { open: false }
  | { open: true; template: AdminScoringTemplate | null }

type PageTab = 'problemSets' | 'categories' | 'scoring'

const PAGE_TABS: Array<{ id: PageTab; label: string; icon: ElementType }> = [
  { id: 'problemSets', label: 'Problem Sets', icon: List },
  { id: 'categories',  label: 'Categories',   icon: Folder },
  { id: 'scoring',     label: 'Scoring / Grades', icon: GraduationCap },
]

// ── Page ─────────────────────────────────────────────────────────────────────

export function AdminQuizzesPage() {
  const [quizzes,            setQuizzes]            = useState<AdminQuiz[]>([])
  const [categories,         setCategories]         = useState<AdminProblemSetCategory[]>([])
  const [scoringTemplates,   setScoringTemplates]   = useState<AdminScoringTemplate[]>([])
  const [activeTab,          setActiveTab]          = useState<PageTab>('problemSets')
  const [loading,            setLoading]            = useState(true)
  const [loadError,          setLoadError]          = useState<string | null>(null)
  const [deleting,           setDeleting]           = useState<Set<string>>(new Set())
  const [confirmId,          setConfirmId]          = useState<string | null>(null)
  const [modal,              setModal]              = useState<ModalState>({ open: false })
  const [categoryModal,      setCategoryModal]      = useState<CategoryModalState>({ open: false })
  const [scoringModal,       setScoringModal]       = useState<ScoringModalState>({ open: false })
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)
  const [confirmCategoryId,  setConfirmCategoryId]  = useState<string | null>(null)
  const [deletingScoringId,  setDeletingScoringId]  = useState<string | null>(null)
  const [confirmScoringId,   setConfirmScoringId]   = useState<string | null>(null)
  const [problemSetSearch,   setProblemSetSearch]   = useState('')
  const [categorySearch,     setCategorySearch]     = useState('')
  const [scoringSearch,      setScoringSearch]      = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    Promise.all([
      getAdminQuizzes(),
      getProblemSetCategories(),
      getAdminScoringTemplates(),
    ])
      .then(([quizData, categoryData, scoringData]) => {
        setQuizzes(quizData)
        setCategories(categoryData)
        setScoringTemplates(scoringData)
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

  async function handleDeleteScoringTemplate(template: AdminScoringTemplate) {
    setDeletingScoringId(template.id)
    setConfirmScoringId(null)
    try {
      await deleteAdminScoringTemplate(template.id)
      setScoringTemplates((prev) => prev.filter((item) => item.id !== template.id))
      toast.success(`Scoring template "${template.title}" deleted`)
    } catch (err) {
      toast.error(err, 'Failed to delete scoring template.')
    } finally {
      setDeletingScoringId(null)
    }
  }

  function handleScoringSaved(isEdit: boolean) {
    setScoringModal({ open: false })
    toast.success(isEdit ? 'Scoring template updated' : 'Scoring template created')
    getAdminScoringTemplates()
      .then(setScoringTemplates)
      .catch(() => {/* silently ignore refresh failure */})
  }

  const filteredQuizzes = quizzes.filter((quiz) => matchesAdminSearch(problemSetSearch, [
    quiz.title,
    quiz.lessonTitle,
    quiz.courseTitle,
    quiz.categoryName,
    quiz.description,
    quiz.status,
    quiz.questionCount,
    `${quiz.questionCount} Q`,
    quiz.sortOrder,
  ]))

  const filteredCategories = categories.filter((category) => matchesAdminSearch(categorySearch, [
    category.name,
    category.sortOrder,
    `Order ${category.sortOrder}`,
    category.problemSetCount,
    `${category.problemSetCount} set${category.problemSetCount === 1 ? '' : 's'}`,
  ]))

  const filteredScoringTemplates = scoringTemplates.filter((template) => matchesAdminSearch(scoringSearch, [
    template.title,
    template.lessonTitle,
    template.courseTitle,
    template.maxScore,
    `${template.maxScore} max`,
    ...template.bands.flatMap((band) => [
      band.classLabel,
      band.description,
      `${band.minScore}-${band.maxScore}`,
    ]),
  ]))

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Problem Sets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading
              ? 'Loading…'
              : `${quizzes.length} problem set${quizzes.length !== 1 ? 's' : ''}, ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}, ${scoringTemplates.length} scoring template${scoringTemplates.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* ── Load error ── */}
      <LoadError message={loadError} />

      <div className="overflow-hidden rounded-xl border shadow-sm">
        {/* ── Tabs ── */}
        <div className="flex flex-col gap-4 border-b px-4 pt-3 sm:flex-row sm:items-stretch sm:justify-between sm:px-6 sm:pt-0">
          <div className="flex flex-wrap items-stretch gap-2 sm:gap-5" role="tablist" aria-label="Problem set management">
            {PAGE_TABS.map((tab) => (
              <ProblemSetPageTab
                key={tab.id}
                tab={tab}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>

          <div className="flex items-center pb-4 sm:pb-0">
            {activeTab === 'problemSets' ? (
              <Button
                onClick={() => setModal({ open: true, quiz: null, loading: false })}
                disabled={!loading && categories.length === 0}
                title={categories.length === 0 ? 'Create a category first' : undefined}
              >
                <Plus className="mr-2 size-4" />
                New Problem Set
              </Button>
            ) : activeTab === 'categories' ? (
              <Button onClick={() => setCategoryModal({ open: true, category: null })}>
                <Plus className="mr-2 size-4" />
                New Category
              </Button>
            ) : (
              <Button onClick={() => setScoringModal({ open: true, template: null })}>
                <Plus className="mr-2 size-4" />
                New Scoring Template
              </Button>
            )}
          </div>
        </div>

        {activeTab === 'categories' ? (
          <ProblemSetCategoriesPanel
            categories={filteredCategories}
            totalCategories={categories.length}
            search={categorySearch}
            onSearchChange={setCategorySearch}
            loading={loading}
            deletingCategoryId={deletingCategoryId}
            confirmCategoryId={confirmCategoryId}
            embedded
            onCreate={() => setCategoryModal({ open: true, category: null })}
            onEdit={(category) => setCategoryModal({ open: true, category })}
            onConfirmDelete={(category) => setConfirmCategoryId(category.id)}
            onCancelDelete={() => setConfirmCategoryId(null)}
            onDelete={handleDeleteCategory}
          />
        ) : activeTab === 'scoring' ? (
          <ScoringTemplatesPanel
            templates={filteredScoringTemplates}
            totalTemplates={scoringTemplates.length}
            search={scoringSearch}
            onSearchChange={setScoringSearch}
            loading={loading}
            deletingTemplateId={deletingScoringId}
            confirmTemplateId={confirmScoringId}
            onCreate={() => setScoringModal({ open: true, template: null })}
            onEdit={(template) => setScoringModal({ open: true, template })}
            onConfirmDelete={(template) => setConfirmScoringId(template.id)}
            onCancelDelete={() => setConfirmScoringId(null)}
            onDelete={handleDeleteScoringTemplate}
          />
        ) : (
          <div className="space-y-4 p-4 sm:p-6">
            <AdminTableSearch
              value={problemSetSearch}
              onChange={setProblemSetSearch}
              placeholder="Search problem sets…"
            />

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

              ) : filteredQuizzes.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No results found"
                  description="Try a different search."
                />

              ) : (
                <div className="divide-y">
                  {filteredQuizzes.map((quiz) => (
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
          </div>
        )}
      </div>

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

      {scoringModal.open && (
        <ScoringTemplateModal
          template={scoringModal.template}
          templates={scoringTemplates}
          onClose={() => setScoringModal({ open: false })}
          onSaved={() => handleScoringSaved(scoringModal.template !== null)}
        />
      )}
    </div>
  )
}

// ── Page tabs ────────────────────────────────────────────────────────────────

interface ProblemSetPageTabProps {
  tab: typeof PAGE_TABS[number]
  active: boolean
  onClick: () => void
}

function ProblemSetPageTab({ tab, active, onClick }: ProblemSetPageTabProps) {
  const Icon = tab.icon

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'relative flex min-h-14 items-center gap-3 px-2 text-sm font-semibold transition-colors sm:min-h-20 sm:px-4',
        'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors',
        active
          ? 'text-foreground after:bg-primary'
          : 'text-muted-foreground after:bg-transparent hover:text-foreground',
      )}
    >
      <Icon className={cn('size-5 transition-colors', active ? 'text-primary' : 'text-muted-foreground')} />
      <span>{tab.label}</span>
    </button>
  )
}

// ── Scoring templates ────────────────────────────────────────────────────────

const DEFAULT_SCORING_BANDS = [
  { minScore: '28', maxScore: '30', classLabel: 'Class S', description: 'Board Passer / Board Top 1' },
  { minScore: '22', maxScore: '27', classLabel: 'Class A', description: 'Board Passer' },
  { minScore: '15', maxScore: '21', classLabel: 'Class B', description: 'Conditional' },
  { minScore: '0',  maxScore: '14', classLabel: 'Class C', description: 'Failed' },
]

interface DraftScoringBand {
  key: string
  minScore: string
  maxScore: string
  classLabel: string
  description: string
}

interface ParsedScoringBand {
  minScore: number
  maxScore: number
  classLabel: string
  description: string
  sortOrder: number
}

interface LessonOption {
  id: string
  title: string
  courseTitle: string
}

function newScoringBand(): DraftScoringBand {
  return {
    key: crypto.randomUUID(),
    minScore: '',
    maxScore: '',
    classLabel: '',
    description: '',
  }
}

function defaultScoringBands(): DraftScoringBand[] {
  return DEFAULT_SCORING_BANDS.map((band) => ({
    key: crypto.randomUUID(),
    ...band,
  }))
}

interface ScoringTemplatesPanelProps {
  templates: AdminScoringTemplate[]
  totalTemplates: number
  search: string
  onSearchChange: (value: string) => void
  loading: boolean
  deletingTemplateId: string | null
  confirmTemplateId: string | null
  onCreate: () => void
  onEdit: (template: AdminScoringTemplate) => void
  onConfirmDelete: (template: AdminScoringTemplate) => void
  onCancelDelete: () => void
  onDelete: (template: AdminScoringTemplate) => void
}

function ScoringTemplatesPanel({
  templates,
  totalTemplates,
  search,
  onSearchChange,
  loading,
  deletingTemplateId,
  confirmTemplateId,
  onCreate,
  onEdit,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
}: ScoringTemplatesPanelProps) {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <AdminTableSearch
        value={search}
        onChange={onSearchChange}
        placeholder="Search scoring templates…"
      />

      <div className="rounded-xl border shadow-sm overflow-hidden">
        <AdminTableHeader cols={SCORING_HEADER_COLS} gridCols={SCORING_GRID_COLS} />

        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full hidden sm:block" />
                <Skeleton className="h-6 w-56 hidden sm:block" />
                <Skeleton className="h-7 w-16 rounded-md" />
              </div>
            ))}
          </div>
        ) : totalTemplates === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No scoring templates yet"
            description="Create grade bands and assign them to a lesson."
            action={
              <Button size="sm" onClick={onCreate}>
                <Plus className="mr-2 size-4" />
                New Scoring Template
              </Button>
            }
          />
        ) : templates.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No results found"
            description="Try a different search."
          />
        ) : (
          <div className="divide-y">
            {templates.map((template) => (
              <ScoringTemplateRow
                key={template.id}
                template={template}
                isDeleting={deletingTemplateId === template.id}
                isConfirmingDelete={confirmTemplateId === template.id}
                onEdit={() => onEdit(template)}
                onConfirmDelete={() => onConfirmDelete(template)}
                onCancelDelete={onCancelDelete}
                onDelete={() => onDelete(template)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface ScoringTemplateRowProps {
  template: AdminScoringTemplate
  isDeleting: boolean
  isConfirmingDelete: boolean
  onEdit: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onDelete: () => void
}

function ScoringTemplateRow({
  template,
  isDeleting,
  isConfirmingDelete,
  onEdit,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
}: ScoringTemplateRowProps) {
  const visibleBands = template.bands.slice(0, 3)
  const hiddenBandCount = Math.max(0, template.bands.length - visibleBands.length)

  return (
    <div className="divide-y">
      <div className={`${ADMIN_ROW_BASE} ${SCORING_GRID_COLS}`}>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{template.title}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <BookMarked className="size-3 text-muted-foreground/60 shrink-0" />
            <p className="truncate text-xs text-muted-foreground">
              {template.lessonTitle} · {template.courseTitle}
            </p>
          </div>
        </div>

        <span className="hidden sm:flex justify-center">
          <Badge variant="secondary" className="tabular-nums">
            {template.maxScore}
          </Badge>
        </span>

        <div className="hidden min-w-0 flex-wrap items-center gap-1.5 sm:flex">
          {visibleBands.map((band) => (
            <Badge key={band.id} variant="outline" className="max-w-full truncate tabular-nums">
              {band.minScore}-{band.maxScore} {band.classLabel}
            </Badge>
          ))}
          {hiddenBandCount > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              +{hiddenBandCount}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-end gap-1">
          <Tip label="Edit scoring template">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={isDeleting}
              onClick={onEdit}
            >
              <Pencil className="size-4" />
            </Button>
          </Tip>
          <Tip label="Delete scoring template" align="right">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={isDeleting}
              onClick={onConfirmDelete}
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </Button>
          </Tip>
        </div>
      </div>

      {isConfirmingDelete && (
        <DeleteConfirmRow
          message={<>Delete scoring template <strong>"{template.title}"</strong>? This cannot be undone.</>}
          onConfirm={onDelete}
          onCancel={onCancelDelete}
        />
      )}
    </div>
  )
}

interface LessonComboboxProps {
  lessons: LessonOption[]
  value: string
  onChange: (lessonId: string) => void
  assignedLessonIds: Set<string>
  currentLessonId: string | null
  disabled: boolean
  loading: boolean
  hasAvailableLessons: boolean
}

function LessonCombobox({
  lessons,
  value,
  onChange,
  assignedLessonIds,
  currentLessonId,
  disabled,
  loading,
  hasAvailableLessons,
}: LessonComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useRef(`lesson-options-${crypto.randomUUID()}`).current

  const selectedLesson = lessons.find((lesson) => lesson.id === value) ?? null
  const normalizedQuery = query.trim().toLowerCase()
  const filteredLessons = lessons.filter((lesson) => {
    if (!normalizedQuery) return true
    return `${lesson.courseTitle} ${lesson.title}`.toLowerCase().includes(normalizedQuery)
  })

  function isAssigned(lesson: LessonOption): boolean {
    return assignedLessonIds.has(lesson.id) && lesson.id !== currentLessonId
  }

  const firstEnabledIndex = filteredLessons.findIndex((lesson) => !isAssigned(lesson))

  useEffect(() => {
    if (!open) return
    setActiveIndex(firstEnabledIndex >= 0 ? firstEnabledIndex : 0)
  }, [firstEnabledIndex, open, query])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  function moveActive(direction: 1 | -1) {
    if (filteredLessons.length === 0) return

    for (let step = 1; step <= filteredLessons.length; step++) {
      const nextIndex = (activeIndex + direction * step + filteredLessons.length) % filteredLessons.length
      if (!isAssigned(filteredLessons[nextIndex])) {
        setActiveIndex(nextIndex)
        return
      }
    }
  }

  function selectLesson(lesson: LessonOption) {
    if (isAssigned(lesson)) return
    onChange(lesson.id)
    setQuery('')
    setOpen(false)
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveActive(1)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveActive(-1)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const activeLesson = filteredLessons[activeIndex]
      if (activeLesson) selectLesson(activeLesson)
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
    }
  }

  const buttonLabel = loading
    ? 'Loading lessons...'
    : !hasAvailableLessons
      ? 'All lessons already have scoring templates'
      : selectedLesson
        ? `${selectedLesson.courseTitle} › ${selectedLesson.title}`
        : 'Search and select a lesson'

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setOpen(true)
          }
        }}
        className={cn(
          'flex min-h-10 w-full items-center justify-between gap-3 rounded-md border border-input bg-background px-3 py-2 text-left text-sm',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <span className={cn('truncate', !selectedLesson && 'text-muted-foreground')}>
          {buttonLabel}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-xl">
          <div className="relative border-b">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              role="searchbox"
              aria-controls={listboxId}
              placeholder="Search subject or lesson..."
              className="h-10 w-full bg-transparent px-9 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div
            id={listboxId}
            role="listbox"
            className="max-h-64 overflow-y-auto py-1"
          >
            {filteredLessons.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No lessons found.
              </div>
            ) : (
              filteredLessons.map((lesson, index) => {
                const assigned = isAssigned(lesson)
                const selected = lesson.id === value
                const active = index === activeIndex

                return (
                  <button
                    key={lesson.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    aria-disabled={assigned}
                    disabled={assigned}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectLesson(lesson)}
                    className={cn(
                      'flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors',
                      active && !assigned && 'bg-muted/70',
                      selected && 'text-primary',
                      assigned
                        ? 'cursor-not-allowed opacity-45'
                        : 'hover:bg-muted/70',
                    )}
                  >
                    <Check className={cn('mt-0.5 size-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{lesson.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {lesson.courseTitle}{assigned ? ' · already assigned' : ''}
                      </span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface ScoringTemplateModalProps {
  template: AdminScoringTemplate | null
  templates: AdminScoringTemplate[]
  onClose: () => void
  onSaved: () => void
}

function ScoringTemplateModal({ template, templates, onClose, onSaved }: ScoringTemplateModalProps) {
  const isEdit = template !== null
  const assignedLessonIds = new Set(
    templates
      .filter((item) => item.id !== template?.id)
      .map((item) => item.lessonId),
  )

  const [title,       setTitle]       = useState(template?.title ?? 'Board Exam Score Bands')
  const [lessonId,    setLessonId]    = useState(template?.lessonId ?? '')
  const [maxScore,    setMaxScore]    = useState(String(template?.maxScore ?? 30))
  const [lessons,     setLessons]     = useState<LessonOption[]>([])
  const [lessonsLoad, setLessonsLoad] = useState(true)
  const [bands,       setBands]       = useState<DraftScoringBand[]>(
    template
      ? template.bands.map((band) => ({
        key:         band.id,
        minScore:    String(band.minScore),
        maxScore:    String(band.maxScore),
        classLabel:  band.classLabel,
        description: band.description,
      }))
      : defaultScoringBands(),
  )
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const [deleteBandTarget, setDeleteBandTarget] = useState<DraftScoringBand | null>(null)

  useEffect(() => {
    getAdminLessons()
      .then((items) => {
        const mapped = items.map((lesson) => ({
          id:          lesson.id,
          title:       lesson.title,
          courseTitle: lesson.courseTitle,
        }))
        setLessons(mapped)

        if (!lessonId) {
          const firstAvailable = mapped.find((lesson) => !assignedLessonIds.has(lesson.id))
          if (firstAvailable) setLessonId(firstAvailable.id)
        }
      })
      .catch(() => setError('Failed to load lessons.'))
      .finally(() => setLessonsLoad(false))
    // Run once when the modal opens; assigned lessons are captured from the
    // current page state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateBand(key: string, patch: Partial<DraftScoringBand>) {
    setBands((prev) => prev.map((band) => band.key === key ? { ...band, ...patch } : band))
  }

  function removeBand(key: string) {
    setBands((prev) => prev.filter((band) => band.key !== key))
    setDeleteBandTarget(null)
  }

  function validate(): { maxScore: number; bands: ParsedScoringBand[] } | { error: string } {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return { error: 'Please enter a scoring template title.' }
    if (!lessonId) return { error: 'Please select a lesson.' }
    if (!/^[0-9]+$/.test(maxScore.trim())) return { error: 'Max score must be a whole number.' }

    const numericMaxScore = Number(maxScore)
    if (numericMaxScore <= 0) return { error: 'Max score must be greater than zero.' }
    if (bands.length === 0) return { error: 'Add at least one grade band.' }

    const parsedBands: ParsedScoringBand[] = []

    for (let i = 0; i < bands.length; i++) {
      const band = bands[i]
      const label = band.classLabel.trim()
      const minText = band.minScore.trim()
      const maxText = band.maxScore.trim()

      if (!/^[0-9]+$/.test(minText) || !/^[0-9]+$/.test(maxText)) {
        return { error: `Band ${i + 1}: scores must be whole numbers.` }
      }
      if (!label) return { error: `Band ${i + 1}: enter a class label.` }

      const min = Number(minText)
      const max = Number(maxText)
      if (min > max) return { error: `Band ${i + 1}: min score cannot be greater than max score.` }
      if (min < 0 || max > numericMaxScore) {
        return { error: `Band ${i + 1}: range must stay within 0 and ${numericMaxScore}.` }
      }

      parsedBands.push({
        minScore:    min,
        maxScore:    max,
        classLabel:  label,
        description: band.description.trim(),
        sortOrder:   i + 1,
      })
    }

    const sorted = [...parsedBands].sort((a, b) => a.minScore - b.minScore)
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i]
      const next = sorted[i + 1]
      if (current.maxScore >= next.minScore) {
        return {
          error: `Bands ${current.minScore}-${current.maxScore} and ${next.minScore}-${next.maxScore} overlap.`,
        }
      }
    }

    return { maxScore: numericMaxScore, bands: parsedBands }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const result = validate()
    if ('error' in result) {
      setError(result.error)
      return
    }

    setSaving(true)
    setError(null)

    try {
      await saveAdminScoringTemplate({
        templateId: template?.id ?? null,
        lessonId,
        title: title.trim(),
        maxScore: result.maxScore,
        bands: result.bands,
      })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scoring template.')
    } finally {
      setSaving(false)
    }
  }

  const hasAvailableLessons = lessons.some((lesson) => !assignedLessonIds.has(lesson.id) || lesson.id === template?.lessonId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={saving ? undefined : onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-xl border bg-background shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{isEdit ? 'Edit Scoring Template' : 'New Scoring Template'}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Inclusive score ranges; gaps are allowed, overlaps are rejected.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Name / Title <span className="text-destructive">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Board Exam Score Bands"
              disabled={saving}
            />
          </div>

          <div className="max-w-xs space-y-1.5">
            <label className="text-sm font-medium">
              Total Questions / Max Score <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              min={1}
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Lesson <span className="text-destructive">*</span>
            </label>
            <LessonCombobox
              lessons={lessons}
              value={lessonId}
              onChange={setLessonId}
              assignedLessonIds={assignedLessonIds}
              currentLessonId={template?.lessonId ?? null}
              disabled={saving || lessonsLoad || !hasAvailableLessons}
              loading={lessonsLoad}
              hasAvailableLessons={hasAvailableLessons}
            />
          </div>

          {/* Grade bands */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium">Grade Bands</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => setBands((prev) => [...prev, newScoringBand()])}
              >
                <Plus className="mr-2 size-4" />
                Add Band
              </Button>
            </div>

            <div className="overflow-hidden rounded-xl border">
              <div className="hidden grid-cols-[5rem_5rem_8rem_1fr_3rem] items-center gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
                <span>Min</span>
                <span>Max</span>
                <span>Class</span>
                <span>Description</span>
                <span />
              </div>

              <div className="divide-y">
                {bands.map((band, index) => (
                  <div key={band.key} className="grid gap-3 px-4 py-3 sm:grid-cols-[5rem_5rem_8rem_1fr_3rem] sm:items-center">
                    <div className="grid grid-cols-2 gap-3 sm:contents">
                      <div className="space-y-1 sm:space-y-0">
                        <label className="text-xs font-medium text-muted-foreground sm:hidden">Min</label>
                        <Input
                          type="number"
                          min={0}
                          value={band.minScore}
                          onChange={(e) => updateBand(band.key, { minScore: e.target.value })}
                          disabled={saving}
                        />
                      </div>
                      <div className="space-y-1 sm:space-y-0">
                        <label className="text-xs font-medium text-muted-foreground sm:hidden">Max</label>
                        <Input
                          type="number"
                          min={0}
                          value={band.maxScore}
                          onChange={(e) => updateBand(band.key, { maxScore: e.target.value })}
                          disabled={saving}
                        />
                      </div>
                    </div>

                    <div className="space-y-1 sm:space-y-0">
                      <label className="text-xs font-medium text-muted-foreground sm:hidden">Class</label>
                      <Input
                        value={band.classLabel}
                        onChange={(e) => updateBand(band.key, { classLabel: e.target.value })}
                        placeholder="Class A"
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-1 sm:space-y-0">
                      <label className="text-xs font-medium text-muted-foreground sm:hidden">Description</label>
                      <Input
                        value={band.description}
                        onChange={(e) => updateBand(band.key, { description: e.target.value })}
                        placeholder={index === 0 ? 'Board Passer / Board Top 1' : 'Description'}
                        disabled={saving}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Tip label="Remove band" align="right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={saving || bands.length === 1}
                          onClick={() => setDeleteBandTarget(band)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </Tip>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || lessonsLoad || !hasAvailableLessons}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Create template'}
          </Button>
        </div>
      </form>
      {deleteBandTarget && (
        <DestructiveConfirmModal
          title="Remove grade band?"
          description={
            <>
              Remove grade band{' '}
              <strong>{deleteBandTarget.classLabel.trim() || `${deleteBandTarget.minScore}-${deleteBandTarget.maxScore}`}</strong>
              ? Save the scoring template to apply the change.
            </>
          }
          confirmLabel="Confirm Remove"
          isWorking={saving}
          onConfirm={() => removeBand(deleteBandTarget.key)}
          onCancel={() => setDeleteBandTarget(null)}
        />
      )}
    </div>
  )
}

// ── Category management ──────────────────────────────────────────────────────

interface ProblemSetCategoriesPanelProps {
  categories: AdminProblemSetCategory[]
  totalCategories: number
  search: string
  onSearchChange: (value: string) => void
  loading: boolean
  deletingCategoryId: string | null
  confirmCategoryId: string | null
  embedded?: boolean
  onCreate: () => void
  onEdit: (category: AdminProblemSetCategory) => void
  onConfirmDelete: (category: AdminProblemSetCategory) => void
  onCancelDelete: () => void
  onDelete: (category: AdminProblemSetCategory) => void
}

function ProblemSetCategoriesPanel({
  categories,
  totalCategories,
  search,
  onSearchChange,
  loading,
  deletingCategoryId,
  confirmCategoryId,
  embedded = false,
  onCreate,
  onEdit,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
}: ProblemSetCategoriesPanelProps) {
  const body = loading ? (
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
  ) : totalCategories === 0 ? (
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
  ) : categories.length === 0 ? (
    <EmptyState
      icon={Tags}
      title="No results found"
      description="Try a different search."
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
  )

  return (
    <section className={embedded ? 'p-4 sm:p-6' : 'rounded-xl border shadow-sm overflow-hidden'}>
      {!embedded && (
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
      )}

      <div className="space-y-4">
        <AdminTableSearch value={search} onChange={onSearchChange} placeholder="Search categories…" />
        {embedded ? <div className="rounded-xl border shadow-sm overflow-hidden">{body}</div> : body}
      </div>
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
