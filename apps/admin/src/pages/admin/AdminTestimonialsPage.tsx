import { useEffect, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Star,
  Trash2,
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
  type AdminTestimonial,
  type AdminTestimonialsContent,
} from '@s-class/api/admin.service'

const EMPTY_CONTENT: AdminTestimonialsContent = {
  eyebrow: '',
  heading: '',
  testimonials: [],
}

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

function normalizeForSave(content: AdminTestimonialsContent): AdminTestimonialsContent {
  return {
    eyebrow: content.eyebrow.trim(),
    heading: content.heading.trim(),
    testimonials: content.testimonials.map((testimonial, index) => ({
      ...testimonial,
      name: testimonial.name.trim(),
      initials: testimonial.initials.trim().toUpperCase(),
      title: testimonial.title.trim(),
      affiliation: testimonial.affiliation.trim(),
      quote: testimonial.quote.trim(),
      rating: Math.trunc(Number(testimonial.rating)),
      sortOrder: index,
    })),
  }
}

function validate(content: AdminTestimonialsContent): string | null {
  if (!content.eyebrow) return 'Section eyebrow is required.'
  if (!content.heading) return 'Section heading is required.'

  for (const [index, testimonial] of content.testimonials.entries()) {
    const label = testimonial.name || `Testimonial ${index + 1}`
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
  }

  return null
}

export function AdminTestimonialsPage() {
  const [form, setForm] = useState<AdminTestimonialsContent>(EMPTY_CONTENT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
    setSuccess(null)
  }

  function setTestimonial(testimonialId: string, nextTestimonial: AdminTestimonial) {
    updateForm((current) => ({
      ...current,
      testimonials: current.testimonials.map((testimonial) =>
        testimonial.id === testimonialId ? nextTestimonial : testimonial,
      ),
    }))
  }

  function addTestimonial() {
    updateForm((current) => ({
      ...current,
      testimonials: [...current.testimonials, createTestimonial(current.testimonials.length)],
    }))
  }

  function removeTestimonial(testimonialId: string) {
    updateForm((current) => ({
      ...current,
      testimonials: current.testimonials.filter((testimonial) => testimonial.id !== testimonialId),
    }))
  }

  function moveTestimonial(index: number, direction: -1 | 1) {
    updateForm((current) => ({
      ...current,
      testimonials: moveItem(current.testimonials, index, direction),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    const normalized = normalizeForSave(form)
    const validationError = validate(normalized)
    if (validationError) {
      setSaveError(validationError)
      setSuccess(null)
      return
    }

    setSaving(true)
    setSaveError(null)
    setSuccess(null)

    try {
      const saved = await saveAdminTestimonialsContent(normalized)
      setForm(saved)
      setSuccess('Testimonials saved.')
      toast.success('Testimonials saved.')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save testimonials.')
    } finally {
      setSaving(false)
    }
  }

  const disabled = loading || saving
  const activeCount = form.testimonials.filter((testimonial) => testimonial.isActive).length

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
          <Button type="submit" disabled={disabled}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <LoadError message={loadError} />

      {success && (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          {success}
        </div>
      )}

      {saveError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {saveError}
        </div>
      )}

      <section className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15">
            <Star className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Section Copy</h2>
            <p className="text-xs text-muted-foreground">Landing page testimonials heading</p>
          </div>
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
              onChange={(nextTestimonial) => setTestimonial(testimonial.id, nextTestimonial)}
              onRemove={() => removeTestimonial(testimonial.id)}
              onMoveUp={() => moveTestimonial(index, -1)}
              onMoveDown={() => moveTestimonial(index, 1)}
            />
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={disabled}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  )
}

interface TestimonialEditorProps {
  testimonial: AdminTestimonial
  testimonialIndex: number
  testimonialCount: number
  disabled: boolean
  onChange: (testimonial: AdminTestimonial) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function TestimonialEditor({
  testimonial,
  testimonialIndex,
  testimonialCount,
  disabled,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: TestimonialEditorProps) {
  const label = testimonial.name.trim() || `Testimonial ${testimonialIndex + 1}`

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
            onClick={() => onChange({ ...testimonial, isActive: !testimonial.isActive })}
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

      <div className="space-y-5 p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_7rem_8rem]">
          <div className="space-y-1.5">
            <label htmlFor={`testimonial-name-${testimonial.id}`} className="text-sm font-medium">Name</label>
            <Input
              id={`testimonial-name-${testimonial.id}`}
              value={testimonial.name}
              onChange={(e) => onChange({ ...testimonial, name: e.target.value })}
              disabled={disabled}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`testimonial-initials-${testimonial.id}`} className="text-sm font-medium">Initials</label>
            <Input
              id={`testimonial-initials-${testimonial.id}`}
              value={testimonial.initials}
              onChange={(e) => onChange({ ...testimonial, initials: e.target.value })}
              maxLength={3}
              disabled={disabled}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`testimonial-rating-${testimonial.id}`} className="text-sm font-medium">Rating</label>
            <Input
              id={`testimonial-rating-${testimonial.id}`}
              type="number"
              min={1}
              max={5}
              value={testimonial.rating}
              onChange={(e) => onChange({ ...testimonial, rating: Number(e.target.value) || 0 })}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor={`testimonial-title-${testimonial.id}`} className="text-sm font-medium">Role / title</label>
            <Input
              id={`testimonial-title-${testimonial.id}`}
              value={testimonial.title}
              onChange={(e) => onChange({ ...testimonial, title: e.target.value })}
              disabled={disabled}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`testimonial-affiliation-${testimonial.id}`} className="text-sm font-medium">School / affiliation</label>
            <Input
              id={`testimonial-affiliation-${testimonial.id}`}
              value={testimonial.affiliation}
              onChange={(e) => onChange({ ...testimonial, affiliation: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`testimonial-quote-${testimonial.id}`} className="text-sm font-medium">Quote</label>
          <textarea
            id={`testimonial-quote-${testimonial.id}`}
            value={testimonial.quote}
            onChange={(e) => onChange({ ...testimonial, quote: e.target.value })}
            rows={4}
            disabled={disabled}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>
    </section>
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
