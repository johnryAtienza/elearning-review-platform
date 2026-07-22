import { useEffect, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Save,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '../../features/admin/components/AdminTable'
import { toast } from '@/lib/toast'
import {
  getAdminTestimonialsContent,
  saveAdminTestimonialsContent,
  updateAdminTestimonialsHeading,
  type AdminTestimonial,
  type AdminTestimonialsContent,
} from '@s-class/api/admin.service'

const EMPTY_CONTENT: AdminTestimonialsContent = {
  eyebrow: '',
  heading: '',
  testimonials: [],
}

type TestimonialModalState =
  | { open: false }
  | { open: true; mode: 'create' | 'edit'; testimonial: AdminTestimonial }

function newId(): string {
  return crypto.randomUUID()
}

function createTestimonial(sortOrder: number): AdminTestimonial {
  return {
    id: newId(),
    name: '',
    initials: '',
    title: '',
    affiliation: '',
    quote: '',
    rating: 5,
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

function normalizeTestimonial(testimonial: AdminTestimonial, sortOrder: number): AdminTestimonial {
  return {
    ...testimonial,
    name: testimonial.name.trim(),
    initials: testimonial.initials.trim().toUpperCase(),
    title: testimonial.title.trim(),
    affiliation: testimonial.affiliation.trim(),
    quote: testimonial.quote.trim(),
    rating: Math.trunc(Number(testimonial.rating)),
    sortOrder,
  }
}

function normalizeForSave(content: AdminTestimonialsContent): AdminTestimonialsContent {
  return {
    eyebrow: content.eyebrow.trim(),
    heading: content.heading.trim(),
    testimonials: content.testimonials.map((testimonial, index) =>
      normalizeTestimonial(testimonial, index),
    ),
  }
}

function validateTestimonial(testimonial: AdminTestimonial, fallbackLabel: string): string | null {
  const label = testimonial.name || fallbackLabel
  if (!testimonial.name) return `${label} needs a reviewer name.`
  if (!testimonial.initials) return `${label} needs avatar initials.`
  if (testimonial.initials.length > 3) return `${label} initials must be 3 characters or fewer.`
  if (!testimonial.title) return `${label} needs a role or title.`
  if (!testimonial.quote) return `${label} needs a quote.`
  if (
    !Number.isInteger(testimonial.rating) ||
    testimonial.rating < 1 ||
    testimonial.rating > 5
  ) {
    return `${label} needs a rating from 1 to 5.`
  }

  return null
}

function validateHeading(
  content: Pick<AdminTestimonialsContent, 'eyebrow' | 'heading'>,
): string | null {
  if (!content.eyebrow) return 'Section eyebrow is required.'
  if (!content.heading) return 'Section heading is required.'

  return null
}

function validateTestimonials(testimonials: AdminTestimonial[]): string | null {
  for (const [index, testimonial] of testimonials.entries()) {
    const error = validateTestimonial(testimonial, `Testimonial ${index + 1}`)
    if (error) return error
  }

  return null
}

function applyTestimonialChange(
  content: AdminTestimonialsContent,
  testimonial: AdminTestimonial,
  mode: 'create' | 'edit',
): AdminTestimonialsContent {
  if (mode === 'create') {
    return {
      ...content,
      testimonials: [
        ...content.testimonials,
        normalizeTestimonial(testimonial, content.testimonials.length),
      ],
    }
  }

  return {
    ...content,
    testimonials: content.testimonials.map((item) =>
      item.id === testimonial.id
        ? normalizeTestimonial(testimonial, item.sortOrder)
        : item,
    ),
  }
}

export function AdminTestimonialsPage() {
  const [form, setForm] = useState<AdminTestimonialsContent>(EMPTY_CONTENT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [modal, setModal] = useState<TestimonialModalState>({ open: false })

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setLoadError(null)
    getAdminTestimonialsContent()
      .then((content) => {
        if (!cancelled) {
          setForm(content)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load testimonials.')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [])

  function updateForm(updater: (current: AdminTestimonialsContent) => AdminTestimonialsContent) {
    setForm(updater)
    setSaveError(null)
  }

  async function setTestimonial(testimonialId: string, nextTestimonial: AdminTestimonial) {
    await saveTestimonialsContent((current) => ({
      ...current,
      testimonials: current.testimonials.map((testimonial) =>
        testimonial.id === testimonialId ? nextTestimonial : testimonial,
      ),
    }), 'Reviewer updated.')
  }

  function addTestimonial() {
    setModal({
      open: true,
      mode: 'create',
      testimonial: createTestimonial(form.testimonials.length),
    })
    setSaveError(null)
  }

  function editTestimonial(testimonial: AdminTestimonial) {
    setModal({ open: true, mode: 'edit', testimonial })
    setSaveError(null)
  }

  async function handleModalSave(testimonial: AdminTestimonial) {
    if (!modal.open || saving) return

    const message = modal.mode === 'create' ? 'Reviewer added.' : 'Reviewer updated.'
    const saved = await saveTestimonialsContent(
      (current) => applyTestimonialChange(current, testimonial, modal.mode),
      message,
    )

    if (saved) {
      setModal({ open: false })
    }
  }

  async function removeTestimonial(testimonialId: string) {
    await saveTestimonialsContent((current) => ({
      ...current,
      testimonials: current.testimonials.filter((testimonial) => testimonial.id !== testimonialId),
    }), 'Reviewer deleted.')
  }

  async function moveTestimonial(index: number, direction: -1 | 1) {
    await saveTestimonialsContent((current) => ({
      ...current,
      testimonials: moveItem(current.testimonials, index, direction),
    }), 'Reviewer order updated.')
  }

  async function saveHeadingContent(): Promise<boolean> {
    if (saving) return false

    const normalized = {
      eyebrow: form.eyebrow.trim(),
      heading: form.heading.trim(),
    }
    const validationError = validateHeading(normalized)
    if (validationError) {
      setSaveError(validationError)
      return false
    }

    setSaving(true)
    setSaveError(null)

    try {
      const saved = await updateAdminTestimonialsHeading(normalized)
      setForm(saved)
      toast.success('Testimonials heading saved.')
      return true
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save testimonials heading.')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function saveTestimonialsContent(
    updater: (current: AdminTestimonialsContent) => AdminTestimonialsContent,
    successMessage: string,
  ): Promise<boolean> {
    if (saving) return false

    const nextContent = updater(form)
    const normalizedTestimonials = normalizeForSave(nextContent).testimonials
    const validationError = validateTestimonials(normalizedTestimonials)
    if (validationError) {
      setSaveError(validationError)
      return false
    }

    setSaving(true)
    setSaveError(null)

    try {
      const latest = await getAdminTestimonialsContent()
      const contentToSave = normalizeForSave({
        ...nextContent,
        eyebrow: latest.eyebrow,
        heading: latest.heading,
      })
      const saved = await saveAdminTestimonialsContent(contentToSave)
      setForm((current) => ({
        ...saved,
        eyebrow: current.eyebrow,
        heading: current.heading,
      }))
      toast.success(successMessage)
      return true
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save testimonials.')
      return false
    } finally {
      setSaving(false)
    }
  }

  const disabled = loading || saving
  const activeCount = form.testimonials.filter((testimonial) => testimonial.isActive).length

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Testimonials</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? 'Loading...' : `${form.testimonials.length} total / ${activeCount} active`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={addTestimonial} disabled={disabled}>
            <Plus className="mr-2 size-4" />
            Reviewer
          </Button>
        </div>
      </div>

      <LoadError message={loadError} />

      {saveError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {saveError}
        </div>
      )}

      <section className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15">
              <Star className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Testimonials Heading</h2>
              <p className="text-xs text-muted-foreground">Landing page testimonials heading</p>
            </div>
          </div>

          <Button type="button" onClick={saveHeadingContent} disabled={disabled} className="sm:shrink-0">
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {loading ? (
            <>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <label htmlFor="testimonials-eyebrow" className="text-sm font-medium">Eyebrow</label>
                <Input
                  id="testimonials-eyebrow"
                  value={form.eyebrow}
                  onChange={(e) => updateForm((current) => ({ ...current, eyebrow: e.target.value }))}
                  disabled={disabled}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="testimonials-heading" className="text-sm font-medium">Heading</label>
                <Input
                  id="testimonials-heading"
                  value={form.heading}
                  onChange={(e) => updateForm((current) => ({ ...current, heading: e.target.value }))}
                  disabled={disabled}
                />
              </div>
            </>
          )}
        </div>
      </section>

      {loading ? (
        <TestimonialsSkeleton />
      ) : form.testimonials.length === 0 ? (
        <div className="rounded-xl border py-16 text-center">
          <Star className="mx-auto size-10 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium">No testimonials yet</p>
          <Button type="button" size="sm" className="mt-4" onClick={addTestimonial}>
            <Plus className="mr-2 size-4" />
            Reviewer
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {form.testimonials.map((testimonial, index) => (
            <TestimonialEditor
              key={testimonial.id}
              testimonial={testimonial}
              testimonialIndex={index}
              testimonialCount={form.testimonials.length}
              disabled={disabled}
              onEdit={() => editTestimonial(testimonial)}
              onToggleActive={() => setTestimonial(testimonial.id, { ...testimonial, isActive: !testimonial.isActive })}
              onRemove={() => removeTestimonial(testimonial.id)}
              onMoveUp={() => moveTestimonial(index, -1)}
              onMoveDown={() => moveTestimonial(index, 1)}
            />
          ))}
        </div>
      )}

      {modal.open && (
        <TestimonialModal
          mode={modal.mode}
          testimonial={modal.testimonial}
          disabled={disabled}
          submitError={saveError}
          onClose={() => setModal({ open: false })}
          onSave={handleModalSave}
        />
      )}
    </div>
  )
}

interface TestimonialEditorProps {
  testimonial: AdminTestimonial
  testimonialIndex: number
  testimonialCount: number
  disabled: boolean
  onEdit: () => void
  onToggleActive: () => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function TestimonialEditor({
  testimonial,
  testimonialIndex,
  testimonialCount,
  disabled,
  onEdit,
  onToggleActive,
  onRemove,
  onMoveUp,
  onMoveDown,
}: TestimonialEditorProps) {
  const label = testimonial.name.trim() || `Testimonial ${testimonialIndex + 1}`
  const stars = Math.min(5, Math.max(1, Math.trunc(testimonial.rating)))

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold">{label}</h2>
            <Badge variant={testimonial.isActive ? 'success' : 'secondary'}>
              {testimonial.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Sort order {testimonialIndex + 1}</p>
        </div>

        <div className="flex items-center gap-1">
          <IconButton
            label="Edit testimonial"
            disabled={disabled}
            onClick={onEdit}
            icon={<Pencil className="size-4" />}
          />
          <IconButton
            label="Move testimonial up"
            disabled={disabled || testimonialIndex === 0}
            onClick={onMoveUp}
            icon={<ArrowUp className="size-4" />}
          />
          <IconButton
            label="Move testimonial down"
            disabled={disabled || testimonialIndex === testimonialCount - 1}
            onClick={onMoveDown}
            icon={<ArrowDown className="size-4" />}
          />
          <IconButton
            label={testimonial.isActive ? 'Deactivate testimonial' : 'Activate testimonial'}
            disabled={disabled}
            onClick={onToggleActive}
            icon={testimonial.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          />
          <IconButton
            label="Delete testimonial"
            disabled={disabled}
            onClick={onRemove}
            icon={<Trash2 className="size-4" />}
            danger
          />
        </div>
      </div>

      <button
        type="button"
        onClick={disabled ? undefined : onEdit}
        disabled={disabled}
        className="block w-full text-left p-5 transition-colors hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <div className="grid gap-4 lg:grid-cols-[3rem_1fr_7rem] lg:items-start">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {testimonial.initials}
          </span>

          <div className="min-w-0 space-y-2">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{testimonial.title}</p>
              {testimonial.affiliation && (
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                  {testimonial.affiliation}
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              “{testimonial.quote}”
            </p>
          </div>

          <div className="flex items-center gap-0.5 text-primary lg:justify-end" aria-label={`${stars} out of 5 stars`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={i < stars ? 'size-4 fill-primary' : 'size-4 text-muted-foreground/30'}
              />
            ))}
          </div>
        </div>
      </button>
    </section>
  )
}

interface TestimonialModalProps {
  mode: 'create' | 'edit'
  testimonial: AdminTestimonial
  disabled: boolean
  submitError: string | null
  onClose: () => void
  onSave: (testimonial: AdminTestimonial) => void | Promise<void>
}

function TestimonialModal({
  mode,
  testimonial,
  disabled,
  submitError,
  onClose,
  onSave,
}: TestimonialModalProps) {
  const [draft, setDraft] = useState<AdminTestimonial>(testimonial)
  const [error, setError] = useState<string | null>(null)
  const isEdit = mode === 'edit'

  function updateDraft(patch: Partial<AdminTestimonial>) {
    setDraft((current) => ({ ...current, ...patch }))
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const normalized = normalizeTestimonial(draft, draft.sortOrder)
    const validationError = validateTestimonial(
      normalized,
      isEdit ? 'This testimonial' : 'New testimonial',
    )
    if (validationError) {
      setError(validationError)
      return
    }

    void onSave(normalized)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl rounded-xl border bg-background shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Update Reviewer' : 'Add Reviewer'}
          </h2>
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="space-y-5 px-6 py-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_7rem_8rem]">
              <div className="space-y-1.5">
                <label htmlFor="testimonial-modal-name" className="text-sm font-medium">
                  Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="testimonial-modal-name"
                  value={draft.name}
                  onChange={(e) => updateDraft({ name: e.target.value })}
                  disabled={disabled}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="testimonial-modal-initials" className="text-sm font-medium">
                  Initials <span className="text-destructive">*</span>
                </label>
                <Input
                  id="testimonial-modal-initials"
                  value={draft.initials}
                  onChange={(e) => updateDraft({ initials: e.target.value })}
                  maxLength={3}
                  disabled={disabled}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="testimonial-modal-rating" className="text-sm font-medium">
                  Rating <span className="text-destructive">*</span>
                </label>
                <Input
                  id="testimonial-modal-rating"
                  type="number"
                  min={1}
                  max={5}
                  value={draft.rating}
                  onChange={(e) => updateDraft({ rating: Number(e.target.value) || 0 })}
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="testimonial-modal-title" className="text-sm font-medium">
                  Role / title <span className="text-destructive">*</span>
                </label>
                <Input
                  id="testimonial-modal-title"
                  value={draft.title}
                  onChange={(e) => updateDraft({ title: e.target.value })}
                  disabled={disabled}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="testimonial-modal-affiliation" className="text-sm font-medium">
                  School / affiliation
                </label>
                <Input
                  id="testimonial-modal-affiliation"
                  value={draft.affiliation}
                  onChange={(e) => updateDraft({ affiliation: e.target.value })}
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="testimonial-modal-quote" className="text-sm font-medium">
                Quote <span className="text-destructive">*</span>
              </label>
              <textarea
                id="testimonial-modal-quote"
                value={draft.quote}
                onChange={(e) => updateDraft({ quote: e.target.value })}
                rows={5}
                disabled={disabled}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => updateDraft({ isActive: e.target.checked })}
                disabled={disabled}
                className="size-4 rounded border-input"
              />
              Active
            </label>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {submitError && !error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {submitError}
              </div>
            )}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={disabled}>
              Cancel
            </Button>
            <Button type="submit" disabled={disabled}>
              {isEdit ? 'Update Reviewer' : 'Add Reviewer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function IconButton({
  label,
  disabled,
  onClick,
  icon,
  danger = false,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  icon: React.ReactNode
  danger?: boolean
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={danger ? 'text-destructive hover:text-destructive' : ''}
    >
      {icon}
    </Button>
  )
}

function TestimonialsSkeleton() {
  return (
    <div className="space-y-5">
      {[0, 1, 2].map((index) => (
        <section key={index} className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex gap-1">
              <Skeleton className="size-9" />
              <Skeleton className="size-9" />
              <Skeleton className="size-9" />
            </div>
          </div>
          <div className="space-y-5 p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_7rem_8rem]">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-28 w-full" />
          </div>
        </section>
      ))}
    </div>
  )
}
