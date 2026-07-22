import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  CircleHelp,
  Eye,
  EyeOff,
  Folder,
  List,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '../../features/admin/components/AdminTable'
import { toast } from '@/lib/toast'
import { cn } from '@/utils/cn'
import { DEFAULT_FAQ_CATEGORIES, DEFAULT_FAQ_PAGE } from '@s-class/api/faqApi'
import {
  getAdminFaqPageContent,
  saveAdminFaqPageContent,
  type AdminFaq,
  type AdminFaqCategory,
  type AdminFaqPageContent,
} from '@s-class/api/admin.service'

type FaqPageField = 'eyebrow' | 'title' | 'description' | 'ctaTitle' | 'ctaDescription' | 'ctaButtonLabel'
type FaqAdminTab = 'content' | 'categories'
type FaqModalState = {
  mode: 'create' | 'edit'
  faq: AdminFaq
}
type CategoryModalState = {
  mode: 'create' | 'edit'
  category: AdminFaqCategory
}

const PAGE_TABS = [
  { id: 'content',    label: 'FAQ Content',    icon: List },
  { id: 'categories', label: 'FAQ Categories', icon: Folder },
] as const

const FIELD_LABELS: Record<FaqPageField, string> = {
  eyebrow:        'Page eyebrow',
  title:          'Page title',
  description:    'Page description',
  ctaTitle:       'Bottom CTA title',
  ctaDescription: 'Bottom CTA description',
  ctaButtonLabel: 'Bottom CTA button label',
}

const DEFAULT_FAQ_ADMIN_CATEGORIES: AdminFaqCategory[] = DEFAULT_FAQ_CATEGORIES.map((category) => ({
  ...category,
  isActive: true,
  createdAt: null,
  updatedAt: null,
}))

const DEFAULT_FAQ_ADMIN_CONTENT: AdminFaqPageContent = {
  ...DEFAULT_FAQ_PAGE.page,
  categories: DEFAULT_FAQ_ADMIN_CATEGORIES,
  faqs: DEFAULT_FAQ_PAGE.groups.flatMap((group) => {
    const category = DEFAULT_FAQ_ADMIN_CATEGORIES.find((item) => item.name === group.category)

    return group.items.map((faq) => ({
      ...faq,
      categoryId: category?.id ?? null,
      category: category?.name ?? group.category,
      isActive: true,
      createdAt: null,
      updatedAt: null,
    }))
  }),
}

function newId(): string {
  return crypto.randomUUID()
}

function createCategory(sortOrder: number, name = 'New category'): AdminFaqCategory {
  return {
    id: newId(),
    name,
    sortOrder,
    isActive: true,
    createdAt: null,
    updatedAt: null,
  }
}

function createFaq(
  sortOrder: number,
  category: AdminFaqCategory | null,
  id = newId(),
): AdminFaq {
  return {
    id,
    categoryId: category?.id ?? null,
    category: category?.name ?? '',
    question: '',
    answer: '',
    sortOrder,
    isActive: true,
    createdAt: null,
    updatedAt: null,
  }
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction
  if (target < 0 || target >= items.length) return items

  const next = [...items]
  const [item] = next.splice(index, 1)
  if (item === undefined) return items
  next.splice(target, 0, item)
  return next
}

function sortCategories(categories: AdminFaqCategory[]): AdminFaqCategory[] {
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
}

function sortFaqs(faqs: AdminFaq[]): AdminFaq[] {
  return [...faqs].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
}

function renumberCategories(categories: AdminFaqCategory[]): AdminFaqCategory[] {
  return categories.map((category, index) => ({ ...category, sortOrder: index }))
}

function renumberFaqsByCategory(
  faqs: AdminFaq[],
  categories: AdminFaqCategory[],
): AdminFaq[] {
  const knownCategoryIds = new Set(categories.map((category) => category.id))
  const nextSortOrders = new Map<string, number>()

  return sortFaqs(faqs).map((faq) => {
    const key = faq.categoryId && knownCategoryIds.has(faq.categoryId)
      ? faq.categoryId
      : '__uncategorized__'
    const sortOrder = nextSortOrders.get(key) ?? 0
    nextSortOrders.set(key, sortOrder + 1)
    return { ...faq, sortOrder }
  })
}

function getCategoryName(category: AdminFaqCategory | undefined, fallback = '') {
  return category?.name.trim() || fallback.trim()
}

function normalizeForSave(content: AdminFaqPageContent): AdminFaqPageContent {
  const categories = renumberCategories(content.categories.map((category) => ({
    ...category,
    name: category.name.trim(),
  })))
  const categoriesById = new Map(categories.map((category) => [category.id, category]))

  return {
    eyebrow: content.eyebrow.trim(),
    title: content.title.trim(),
    description: content.description.trim(),
    ctaTitle: content.ctaTitle.trim(),
    ctaDescription: content.ctaDescription.trim(),
    ctaButtonLabel: content.ctaButtonLabel.trim(),
    categories,
    faqs: content.faqs.map((faq) => ({
      ...faq,
      category: getCategoryName(faq.categoryId ? categoriesById.get(faq.categoryId) : undefined, faq.category),
      question: faq.question.trim(),
      answer: faq.answer.trim(),
      sortOrder: Number.isFinite(faq.sortOrder) ? Math.trunc(faq.sortOrder) : 0,
    })),
  }
}

function validate(content: AdminFaqPageContent): string | null {
  for (const field of Object.keys(FIELD_LABELS) as FaqPageField[]) {
    if (!content[field]) return `${FIELD_LABELS[field]} is required.`
  }

  const categoryNames = new Set<string>()
  for (const [index, category] of content.categories.entries()) {
    const label = category.name || `FAQ category ${index + 1}`
    if (!category.name) return `${label} needs a name.`

    const key = category.name.toLocaleLowerCase()
    if (categoryNames.has(key)) return `${category.name} is already used by another category.`
    categoryNames.add(key)
  }

  const categoryIds = new Set(content.categories.map((category) => category.id))
  for (const [index, faq] of content.faqs.entries()) {
    const label = faq.question || `FAQ item ${index + 1}`
    if (!faq.categoryId || !categoryIds.has(faq.categoryId)) return `${label} needs a category.`
    if (!faq.question) return `${label} needs a question.`
    if (!faq.answer) return `${label} needs an answer.`
    if (!Number.isInteger(faq.sortOrder)) return `${label} needs a whole-number sort order.`
  }

  return null
}

function validatePageFields(content: Pick<AdminFaqPageContent, FaqPageField>): string | null {
  for (const field of Object.keys(FIELD_LABELS) as FaqPageField[]) {
    if (!content[field].trim()) return `${FIELD_LABELS[field]} is required.`
  }

  return null
}

function copyPageFields(from: AdminFaqPageContent): Pick<AdminFaqPageContent, FaqPageField> {
  return {
    eyebrow: from.eyebrow,
    title: from.title,
    description: from.description,
    ctaTitle: from.ctaTitle,
    ctaDescription: from.ctaDescription,
    ctaButtonLabel: from.ctaButtonLabel,
  }
}

interface FaqAdminGroup {
  category: AdminFaqCategory | null
  faqs: AdminFaq[]
}

function buildFaqGroups(
  categories: AdminFaqCategory[],
  faqs: AdminFaq[],
): FaqAdminGroup[] {
  const sortedCategories = sortCategories(categories)
  const knownCategoryIds = new Set(sortedCategories.map((category) => category.id))
  const groups: FaqAdminGroup[] = sortedCategories.map((category) => ({
    category,
    faqs: sortFaqs(faqs.filter((faq) => faq.categoryId === category.id)),
  }))
  const uncategorizedFaqs = sortFaqs(
    faqs.filter((faq) => !faq.categoryId || !knownCategoryIds.has(faq.categoryId)),
  )

  if (uncategorizedFaqs.length > 0) {
    groups.push({ category: null, faqs: uncategorizedFaqs })
  }

  return groups
}

export function AdminFaqPage() {
  const [form, setForm] = useState<AdminFaqPageContent>(DEFAULT_FAQ_ADMIN_CONTENT)
  const [savedContent, setSavedContent] = useState<AdminFaqPageContent>(DEFAULT_FAQ_ADMIN_CONTENT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<FaqAdminTab>('content')
  const [categoryModal, setCategoryModal] = useState<CategoryModalState | null>(null)
  const [faqModal, setFaqModal] = useState<FaqModalState | null>(null)
  const [pendingFocusFaqId, setPendingFocusFaqId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setLoadError(null)
    getAdminFaqPageContent()
      .then((content) => {
        if (!cancelled) {
          setForm(content)
          setSavedContent(content)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load FAQ page.')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [])

  const faqGroups = useMemo(
    () => buildFaqGroups(form.categories, form.faqs),
    [form.categories, form.faqs],
  )

  useEffect(() => {
    if (!pendingFocusFaqId || activeTab !== 'content') return

    const item = document.getElementById(`faq-item-${pendingFocusFaqId}`)
    if (!item) return

    item.scrollIntoView({ behavior: 'smooth', block: 'center' })

    window.setTimeout(() => {
      document.getElementById(`faq-${pendingFocusFaqId}-question`)?.focus()
      setPendingFocusFaqId(null)
    }, 250)
  }, [activeTab, form.faqs, pendingFocusFaqId])

  function updateForm(updater: (current: AdminFaqPageContent) => AdminFaqPageContent) {
    setForm(updater)
    setSaveError(null)
  }

  function setPageField(field: FaqPageField, value: string) {
    updateForm((current) => ({ ...current, [field]: value }))
  }

  function removeCategory(categoryId: string) {
    updateForm((current) => {
      const remainingCategories = renumberCategories(
        current.categories.filter((category) => category.id !== categoryId),
      )
      const affectedFaqs = current.faqs.filter((faq) => faq.categoryId === categoryId)

      if (affectedFaqs.length === 0) {
        return {
          ...current,
          categories: remainingCategories,
        }
      }

      const fallbackCategories = remainingCategories.length > 0
        ? remainingCategories
        : [createCategory(0, 'Uncategorized')]
      const fallbackCategory = fallbackCategories[0]
      if (!fallbackCategory) {
        return {
          ...current,
          categories: fallbackCategories,
        }
      }

      return {
        ...current,
        categories: fallbackCategories,
        faqs: renumberFaqsByCategory(
          current.faqs.map((faq) =>
            faq.categoryId === categoryId
              ? { ...faq, categoryId: fallbackCategory.id, category: fallbackCategory.name }
              : faq,
          ),
          fallbackCategories,
        ),
      }
    })
  }

  function moveCategory(index: number, direction: -1 | 1) {
    updateForm((current) => ({
      ...current,
      categories: renumberCategories(moveItem(sortCategories(current.categories), index, direction)),
    }))
  }

  function createCategoryDraft(): AdminFaqCategory {
    return createCategory(
      form.categories.reduce((max, category) => Math.max(max, category.sortOrder), -1) + 1,
      '',
    )
  }

  function openAddCategory() {
    setActiveTab('categories')
    setCategoryModal({ mode: 'create', category: createCategoryDraft() })
  }

  function openEditCategory(category: AdminFaqCategory) {
    setCategoryModal({ mode: 'edit', category })
  }

  function createFaqDraft(categoryId?: string | null): AdminFaq {
    const faqId = newId()
    let category = categoryId
      ? form.categories.find((item) => item.id === categoryId)
      : form.categories.find((item) => item.isActive) ?? form.categories[0]

    if (!category) {
      const fallbackCategory = createCategory(0, 'New category')
      category = fallbackCategory
      updateForm((current) => ({
        ...current,
        categories: current.categories.length > 0 ? current.categories : [fallbackCategory],
      }))
    }

    const sortOrder = form.faqs
      .filter((faq) => faq.categoryId === category.id)
      .reduce((max, faq) => Math.max(max, faq.sortOrder), -1) + 1

    return createFaq(sortOrder, category, faqId)
  }

  function openAddFaq(categoryId?: string | null) {
    setActiveTab('content')
    setFaqModal({ mode: 'create', faq: createFaqDraft(categoryId) })
  }

  function openEditFaq(faq: AdminFaq) {
    setFaqModal({ mode: 'edit', faq })
  }

  async function saveContent(
    nextContent: AdminFaqPageContent,
    successMessage: string,
    preservePageFields = false,
  ): Promise<AdminFaqPageContent | null> {
    if (saving) return null

    const normalized = normalizeForSave(nextContent)
    const validationError = validate(normalized)
    if (validationError) {
      setSaveError(validationError)
      return null
    }

    setSaving(true)
    setSaveError(null)
    const currentPageFields = copyPageFields(form)

    try {
      const saved = await saveAdminFaqPageContent(normalized)
      setForm(preservePageFields ? { ...saved, ...currentPageFields } : saved)
      setSavedContent(saved)
      toast.success(successMessage)
      return saved
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save FAQ page.')
      return null
    } finally {
      setSaving(false)
    }
  }

  function saveFaqsOnly(nextContent: AdminFaqPageContent, successMessage: string) {
    return saveContent(
      {
        ...nextContent,
        ...copyPageFields(savedContent),
      },
      successMessage,
      true,
    )
  }

  async function handleSavePageContent(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    const nextPageFields = copyPageFields(form)
    const validationError = validatePageFields(nextPageFields)
    if (validationError) {
      setSaveError(validationError)
      return
    }

    setSaving(true)
    setSaveError(null)

    try {
      const saved = await saveAdminFaqPageContent(normalizeForSave({
        ...savedContent,
        ...nextPageFields,
      }))
      setSavedContent(saved)
      setForm((current) => ({
        ...current,
        ...copyPageFields(saved),
      }))
      toast.success('FAQ page content saved.')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save FAQ page content.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveCategories() {
    await saveFaqsOnly(form, 'FAQ categories saved.')
  }

  async function handleSaveCategory(nextCategory: AdminFaqCategory, mode: CategoryModalState['mode']) {
    const categoryName = nextCategory.name.trim()
    const categoryWithName = { ...nextCategory, name: categoryName }
    const nextForm = {
      ...form,
      categories: mode === 'create'
        ? [...form.categories, categoryWithName]
        : form.categories.map((category) =>
            category.id === categoryWithName.id ? categoryWithName : category,
          ),
      faqs: form.faqs.map((faq) =>
        faq.categoryId === categoryWithName.id ? { ...faq, category: categoryName } : faq,
      ),
    }
    const saved = await saveFaqsOnly(nextForm, mode === 'create' ? 'FAQ category added.' : 'FAQ category updated.')

    if (saved) setCategoryModal(null)
  }

  async function handleSaveFaqItem(nextFaq: AdminFaq, mode: FaqModalState['mode']) {
    const category = form.categories.find((item) => item.id === nextFaq.categoryId)
    const faqWithCategory = {
      ...nextFaq,
      category: category?.name ?? nextFaq.category,
    }
    const nextForm = {
      ...form,
      faqs: mode === 'create'
        ? [...form.faqs, faqWithCategory]
        : form.faqs.map((faq) => faq.id === faqWithCategory.id ? faqWithCategory : faq),
    }
    const saved = await saveFaqsOnly(nextForm, mode === 'create' ? 'FAQ item added.' : 'FAQ item updated.')

    if (saved) {
      setFaqModal(null)
      setPendingFocusFaqId(nextFaq.id)
    }
  }

  async function handleRemoveFaq(faqId: string) {
    const nextForm = {
      ...form,
      faqs: form.faqs.filter((faq) => faq.id !== faqId),
    }
    await saveFaqsOnly(nextForm, 'FAQ item deleted.')
  }

  async function handleChangeFaq(nextFaq: AdminFaq) {
    const nextForm = {
      ...form,
      faqs: form.faqs.map((faq) => faq.id === nextFaq.id ? nextFaq : faq),
    }
    await saveFaqsOnly(nextForm, 'FAQ item updated.')
  }

  async function handleMoveFaq(categoryId: string | null, faqId: string, direction: -1 | 1) {
    const knownCategoryIds = new Set(form.categories.map((category) => category.id))
    const categoryFaqs = sortFaqs(form.faqs.filter((faq) =>
      categoryId === null
        ? !faq.categoryId || !knownCategoryIds.has(faq.categoryId)
        : faq.categoryId === categoryId,
    ))
    const index = categoryFaqs.findIndex((faq) => faq.id === faqId)
    const movedFaqs = moveItem(categoryFaqs, index, direction)
      .map((faq, sortOrder) => ({ ...faq, sortOrder }))
    const movedById = new Map(movedFaqs.map((faq) => [faq.id, faq]))
    const nextForm = {
      ...form,
      faqs: form.faqs.map((faq) => movedById.get(faq.id) ?? faq),
    }

    await saveFaqsOnly(nextForm, 'FAQ item order saved.')
  }

  const disabled = loading || saving
  const activeFaqCount = form.faqs.filter((faq) => faq.isActive).length
  const activeCategoryCount = form.categories.filter((category) => category.isActive).length

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">FAQ Page</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading
              ? 'Loading...'
              : `${form.categories.length} categories / ${form.faqs.length} FAQs / ${activeFaqCount} active`}
          </p>
        </div>
      </div>

      <LoadError message={loadError} />

      {saveError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {saveError}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border shadow-sm">
        <div className="flex flex-col gap-4 border-b px-4 pt-3 sm:flex-row sm:items-stretch sm:justify-between sm:px-6 sm:pt-0">
          <div className="flex flex-wrap items-stretch gap-2 sm:gap-5" role="tablist" aria-label="FAQ page management">
            {PAGE_TABS.map((tab) => (
              <FaqPageTab
                key={tab.id}
                tab={tab}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>

          <div className="flex items-center pb-4 sm:pb-0">
            {activeTab === 'content' ? (
              <Button type="button" onClick={() => openAddFaq()} disabled={disabled}>
                <Plus className="mr-2 size-4" />
                Add FAQ Item
              </Button>
            ) : (
              <Button type="button" onClick={openAddCategory} disabled={disabled}>
                <Plus className="mr-2 size-4" />
                Add Category
              </Button>
            )}
          </div>
        </div>

        {activeTab === 'categories' ? (
          <div className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold">FAQ Categories</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {loading ? 'Loading...' : `${form.categories.length} total / ${activeCategoryCount} active`}
                </p>
              </div>
              <Button type="button" onClick={handleSaveCategories} disabled={disabled}>
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                {saving ? 'Saving...' : 'Save Categories'}
              </Button>
            </div>

            {loading ? (
              <CategorySkeleton />
            ) : form.categories.length === 0 ? (
              <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                No FAQ categories yet.
              </div>
            ) : (
              <div className="space-y-3">
                {sortCategories(form.categories).map((category, index) => (
                  <CategoryEditor
                    key={category.id}
                    category={category}
                    index={index}
                    total={form.categories.length}
                    disabled={disabled}
                    faqCount={form.faqs.filter((faq) => faq.categoryId === category.id).length}
                    onEdit={() => openEditCategory(category)}
                    onChange={(nextCategory) => void handleSaveCategory(nextCategory, 'edit')}
                    onMove={(direction) => moveCategory(index, direction)}
                    onRemove={() => removeCategory(category.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 p-4 sm:p-6">
            <section className="rounded-xl border bg-card shadow-sm">
              <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15">
                    <CircleHelp className="size-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">FAQ Page Content</h2>
                    <p className="text-xs text-muted-foreground">Header text and bottom CTA</p>
                  </div>
                </div>
                <Button type="button" onClick={handleSavePageContent} disabled={disabled}>
                  {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                  {saving ? 'Saving...' : 'Save Content'}
                </Button>
              </div>

              <div className="space-y-6 p-5">
                {loading ? (
                  <FaqPageFormSkeleton />
                ) : (
                  <>
                    <FormSection title="Page header">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                          id="faq-page-eyebrow"
                          label="Page eyebrow"
                          value={form.eyebrow}
                          onChange={(value) => setPageField('eyebrow', value)}
                          disabled={disabled}
                        />
                        <TextField
                          id="faq-page-title"
                          label="Page title"
                          value={form.title}
                          onChange={(value) => setPageField('title', value)}
                          disabled={disabled}
                        />
                      </div>
                      <TextareaField
                        id="faq-page-description"
                        label="Page description"
                        value={form.description}
                        onChange={(value) => setPageField('description', value)}
                        rows={3}
                        disabled={disabled}
                      />
                    </FormSection>

                    <FormSection title="Bottom CTA">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                          id="faq-page-cta-title"
                          label="CTA title"
                          value={form.ctaTitle}
                          onChange={(value) => setPageField('ctaTitle', value)}
                          disabled={disabled}
                        />
                        <TextField
                          id="faq-page-cta-button"
                          label="Button label"
                          value={form.ctaButtonLabel}
                          onChange={(value) => setPageField('ctaButtonLabel', value)}
                          disabled={disabled}
                        />
                      </div>
                      <TextareaField
                        id="faq-page-cta-description"
                        label="CTA description"
                        value={form.ctaDescription}
                        onChange={(value) => setPageField('ctaDescription', value)}
                        rows={2}
                        disabled={disabled}
                      />
                    </FormSection>
                  </>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold">FAQ items</h2>
                <p className="text-xs text-muted-foreground mt-1">Items are grouped by their selected category.</p>
              </div>

              {loading ? (
                <FaqItemsSkeleton />
              ) : form.faqs.length === 0 ? (
                <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
                  No FAQ items yet.
                </div>
              ) : (
                <div className="space-y-5">
                  {faqGroups.map((group) => (
                    <FaqGroupEditor
                      key={group.category?.id ?? 'uncategorized'}
                      group={group}
                      disabled={disabled}
                      onAddFaq={() => openAddFaq(group.category?.id)}
                      onEditFaq={openEditFaq}
                      onChangeFaq={(nextFaq) => void handleChangeFaq(nextFaq)}
                      onMoveFaq={(faqId, direction) => void handleMoveFaq(group.category?.id ?? null, faqId, direction)}
                      onRemoveFaq={(faqId) => void handleRemoveFaq(faqId)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
    {categoryModal && (
      <FaqCategoryModal
        mode={categoryModal.mode}
        category={categoryModal.category}
        categories={form.categories}
        disabled={disabled}
        onClose={() => setCategoryModal(null)}
        onSave={(category) => void handleSaveCategory(category, categoryModal.mode)}
      />
    )}
    {faqModal && (
      <FaqItemModal
        mode={faqModal.mode}
        faq={faqModal.faq}
        categories={sortCategories(form.categories)}
        disabled={disabled}
        onClose={() => setFaqModal(null)}
        onSave={(nextFaq) => void handleSaveFaqItem(nextFaq, faqModal.mode)}
      />
    )}
    </>
  )
}

function FaqCategoryModal({
  mode,
  category,
  categories,
  disabled,
  onClose,
  onSave,
}: {
  mode: CategoryModalState['mode']
  category: AdminFaqCategory
  categories: AdminFaqCategory[]
  disabled: boolean
  onClose: () => void
  onSave: (category: AdminFaqCategory) => void
}) {
  const [draft, setDraft] = useState(category)
  const [error, setError] = useState<string | null>(null)
  const title = mode === 'create' ? 'Add FAQ Category' : 'Update FAQ Category'

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      document.getElementById(`faq-category-modal-${category.id}-name`)?.focus()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [category.id])

  function patch(updates: Partial<AdminFaqCategory>) {
    setDraft((current) => ({ ...current, ...updates }))
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (disabled) return

    const trimmedName = draft.name.trim()
    if (!trimmedName) {
      setError('Please enter a category name.')
      return
    }

    const normalizedName = trimmedName.toLocaleLowerCase()
    const alreadyExists = categories.some(
      (item) =>
        item.id !== category.id &&
        item.name.trim().toLocaleLowerCase() === normalizedName,
    )
    if (alreadyExists) {
      setError('That category already exists.')
      return
    }

    setError(null)
    onSave({ ...draft, name: trimmedName })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={disabled ? undefined : onClose} />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="faq-category-modal-title"
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-xl border bg-background shadow-xl"
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 id="faq-category-modal-title" className="text-lg font-semibold">{title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Manage the category name and visibility.
            </p>
          </div>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose} disabled={disabled}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="space-y-1.5">
            <label htmlFor={`faq-category-modal-${category.id}-name`} className="text-sm font-medium">
              Category name <span className="text-destructive">*</span>
            </label>
            <Input
              id={`faq-category-modal-${category.id}-name`}
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="e.g. Enrollment"
              disabled={disabled}
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => patch({ isActive: e.target.checked })}
              disabled={disabled}
              className="size-4 rounded border-input"
            />
            Active
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={disabled}>
            Cancel
          </Button>
          <Button type="submit" disabled={disabled}>
            {disabled ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            {disabled ? 'Saving...' : title}
          </Button>
        </div>
      </form>
    </div>
  )
}

interface FaqPageTabProps {
  tab: typeof PAGE_TABS[number]
  active: boolean
  onClick: () => void
}

function FaqPageTab({ tab, active, onClick }: FaqPageTabProps) {
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

function FormSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4 border-t pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function CategoryEditor({
  category,
  index,
  total,
  disabled,
  faqCount,
  onEdit,
  onChange,
  onMove,
  onRemove,
}: {
  category: AdminFaqCategory
  index: number
  total: number
  disabled: boolean
  faqCount: number
  onEdit: () => void
  onChange: (category: AdminFaqCategory) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
}) {
  function patch(updates: Partial<AdminFaqCategory>) {
    onChange({ ...category, ...updates })
  }

  return (
    <article className="rounded-lg border bg-background/40 px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="w-8 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
            #{index + 1}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-sm font-semibold">{category.name || 'Untitled category'}</p>
            <p className="text-xs text-muted-foreground">Category name</p>
          </div>
          <Badge variant={category.isActive ? 'success' : 'secondary'}>
            {category.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <Badge variant="outline">{faqCount} FAQs</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            disabled={disabled || index === 0}
            onClick={() => onMove(-1)}
            aria-label="Move category up"
            title="Move up"
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            disabled={disabled || index === total - 1}
            onClick={() => onMove(1)}
            aria-label="Move category down"
            title="Move down"
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={onEdit}
          >
            <Pencil className="mr-2 size-4" />
            Update
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => patch({ isActive: !category.isActive })}
          >
            {category.isActive ? <EyeOff className="mr-2 size-4" /> : <Eye className="mr-2 size-4" />}
            {category.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            disabled={disabled}
            onClick={onRemove}
            aria-label="Delete category"
            title="Delete"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </article>
  )
}

function FaqGroupEditor({
  group,
  disabled,
  onAddFaq,
  onEditFaq,
  onChangeFaq,
  onMoveFaq,
  onRemoveFaq,
}: {
  group: FaqAdminGroup
  disabled: boolean
  onAddFaq: () => void
  onEditFaq: (faq: AdminFaq) => void
  onChangeFaq: (faq: AdminFaq) => void
  onMoveFaq: (faqId: string, direction: -1 | 1) => void
  onRemoveFaq: (faqId: string) => void
}) {
  const heading = group.category?.name ?? 'Uncategorized'
  const activeFaqCount = group.faqs.filter((faq) => faq.isActive).length

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{heading}</h3>
          {group.category && (
            <Badge variant={group.category.isActive ? 'success' : 'secondary'}>
              {group.category.isActive ? 'Active category' : 'Inactive category'}
            </Badge>
          )}
          <Badge variant="outline">{group.faqs.length} total / {activeFaqCount} active</Badge>
        </div>
        {group.category && (
          <Button type="button" variant="outline" size="sm" onClick={onAddFaq} disabled={disabled}>
            <Plus className="mr-2 size-4" />
            Add FAQ Item
          </Button>
        )}
      </div>

      <div className="space-y-4 p-5">
        {group.faqs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No FAQ items in this category.</p>
        ) : (
          group.faqs.map((faq, index) => (
            <FaqItemEditor
              key={faq.id}
              faq={faq}
              index={index}
              total={group.faqs.length}
              disabled={disabled}
              onEdit={() => onEditFaq(faq)}
              onChange={(nextFaq) => onChangeFaq(nextFaq)}
              onMove={(direction) => onMoveFaq(faq.id, direction)}
              onRemove={() => onRemoveFaq(faq.id)}
            />
          ))
        )}
      </div>
    </section>
  )
}

function FaqItemEditor({
  faq,
  index,
  total,
  disabled,
  onEdit,
  onChange,
  onMove,
  onRemove,
}: {
  faq: AdminFaq
  index: number
  total: number
  disabled: boolean
  onEdit: () => void
  onChange: (faq: AdminFaq) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
}) {
  function patch(updates: Partial<AdminFaq>) {
    onChange({ ...faq, ...updates })
  }

  return (
    <article id={`faq-item-${faq.id}`} className="rounded-lg border bg-background/40 px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold">FAQ item {index + 1}</h4>
            <Badge variant="outline">Order {faq.sortOrder + 1}</Badge>
            <Badge variant={faq.isActive ? 'success' : 'secondary'}>
              {faq.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="truncate text-sm font-medium">{faq.question || 'Untitled question'}</p>
          <p className="line-clamp-2 text-xs text-muted-foreground">{faq.answer || 'No answer yet.'}</p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            disabled={disabled || index === 0}
            onClick={() => onMove(-1)}
            aria-label="Move FAQ up"
            title="Move up"
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            disabled={disabled || index === total - 1}
            onClick={() => onMove(1)}
            aria-label="Move FAQ down"
            title="Move down"
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={onEdit}
          >
            <Pencil className="mr-2 size-4" />
            Update
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => patch({ isActive: !faq.isActive })}
          >
            {faq.isActive ? <EyeOff className="mr-2 size-4" /> : <Eye className="mr-2 size-4" />}
            {faq.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            disabled={disabled}
            onClick={onRemove}
            aria-label="Delete FAQ"
            title="Delete"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </article>
  )
}

function FaqItemModal({
  mode,
  faq,
  categories,
  disabled,
  onClose,
  onSave,
}: {
  mode: FaqModalState['mode']
  faq: AdminFaq
  categories: AdminFaqCategory[]
  disabled: boolean
  onClose: () => void
  onSave: (faq: AdminFaq) => void
}) {
  const [draft, setDraft] = useState(faq)
  const [error, setError] = useState<string | null>(null)
  const title = mode === 'create' ? 'Add FAQ Item' : 'Update FAQ Item'

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      document.getElementById(`faq-modal-${faq.id}-question`)?.focus()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [faq.id])

  function patch(updates: Partial<AdminFaq>) {
    setDraft((current) => ({ ...current, ...updates }))
    setError(null)
  }

  function handleCategoryChange(categoryId: string) {
    const category = categories.find((item) => item.id === categoryId)
    patch({
      categoryId,
      category: category?.name ?? draft.category,
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (disabled) return

    if (!draft.categoryId) {
      setError('Please choose a category.')
      return
    }
    if (!draft.question.trim()) {
      setError('Question is required.')
      return
    }
    if (!draft.answer.trim()) {
      setError('Answer is required.')
      return
    }
    if (!Number.isInteger(draft.sortOrder)) {
      setError('Sort order must be a whole number.')
      return
    }

    onSave({
      ...draft,
      question: draft.question.trim(),
      answer: draft.answer.trim(),
      category: draft.category.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={disabled ? undefined : onClose} />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="faq-item-modal-title"
        onSubmit={handleSubmit}
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border bg-background shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
          <div>
            <h2 id="faq-item-modal-title" className="text-lg font-semibold">{title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Manage the question, answer, category, order, and visibility.
            </p>
          </div>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose} disabled={disabled}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <SelectField
              id={`faq-modal-${faq.id}-category`}
              label="Category"
              value={draft.categoryId ?? ''}
              onChange={handleCategoryChange}
              disabled={disabled || categories.length === 0}
              categories={categories}
            />
            <NumberField
              id={`faq-modal-${faq.id}-sort-order`}
              label="Sort order"
              value={draft.sortOrder}
              onChange={(value) => patch({ sortOrder: value })}
              disabled={disabled}
            />
          </div>

          <TextField
            id={`faq-modal-${faq.id}-question`}
            label="Question"
            value={draft.question}
            onChange={(value) => patch({ question: value })}
            disabled={disabled}
          />

          <TextareaField
            id={`faq-modal-${faq.id}-answer`}
            label="Answer"
            value={draft.answer}
            onChange={(value) => patch({ answer: value })}
            rows={6}
            disabled={disabled}
          />

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => patch({ isActive: e.target.checked })}
              disabled={disabled}
              className="size-4 rounded border-input"
            />
            Active
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={disabled}>
            Cancel
          </Button>
          <Button type="submit" disabled={disabled}>
            {disabled ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            {disabled ? 'Saving...' : title}
          </Button>
        </div>
      </form>
    </div>
  )
}

function TextField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  )
}

function SelectField({
  id,
  label,
  value,
  onChange,
  disabled,
  categories,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
  categories: AdminFaqCategory[]
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="" disabled>Choose category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name || 'Untitled category'}{category.isActive ? '' : ' (inactive)'}
          </option>
        ))}
      </select>
    </div>
  )
}

function NumberField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.trunc(Number(e.target.value || 0))))}
        disabled={disabled}
      />
    </div>
  )
}

function TextareaField({
  id,
  label,
  value,
  onChange,
  rows,
  disabled,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  rows: number
  disabled: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        disabled={disabled}
        className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  )
}

function CategorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="rounded-lg border bg-background/40 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

function FaqPageFormSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="space-y-4 border-t pt-5 first:border-t-0 first:pt-0">
          <Skeleton className="h-4 w-28" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

function FaqItemsSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
