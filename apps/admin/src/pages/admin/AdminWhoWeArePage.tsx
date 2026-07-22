import { useEffect, useState } from 'react'
import { CheckCircle2, FileText, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '../../features/admin/components/AdminTable'
import { toast } from '@/lib/toast'
import {
  getAdminWhoWeArePage,
  updateAdminWhoWeArePage,
} from '@s-class/api/admin.service'
import { DEFAULT_WHO_WE_ARE_PAGE_CONTENT } from '@s-class/api/homeContentApi'
import type { WhoWeArePageContent } from '@s-class/types/home'

type WhoWeArePageField = keyof WhoWeArePageContent

const FIELD_LABELS: Record<WhoWeArePageField, string> = {
  eyebrow:               'Page eyebrow',
  title:                 'Page title',
  whoAreWeLabel:         'Who Are We label',
  whoAreWeBody:          'Who Are We body text',
  reviewPhilosophyLabel: 'Review Philosophy label',
  reviewPhilosophyBody:  'Review Philosophy body text',
  missionLabel:          'Mission label',
  missionBody:           'Mission body text',
  visionLabel:           'Vision label',
  visionBody:            'Vision body text',
}

function normalizeWhoWeArePageContent(content: WhoWeArePageContent): WhoWeArePageContent {
  return {
    eyebrow:               content.eyebrow.trim(),
    title:                 content.title.trim(),
    whoAreWeLabel:         content.whoAreWeLabel.trim(),
    whoAreWeBody:          content.whoAreWeBody.trim(),
    reviewPhilosophyLabel: content.reviewPhilosophyLabel.trim(),
    reviewPhilosophyBody:  content.reviewPhilosophyBody.trim(),
    missionLabel:          content.missionLabel.trim(),
    missionBody:           content.missionBody.trim(),
    visionLabel:           content.visionLabel.trim(),
    visionBody:            content.visionBody.trim(),
  }
}

export function AdminWhoWeArePage() {
  const [form,      setForm]      = useState<WhoWeArePageContent>(DEFAULT_WHO_WE_ARE_PAGE_CONTENT)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [success,   setSuccess]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setLoadError(null)
    getAdminWhoWeArePage()
      .then((content) => {
        if (!cancelled) {
          setForm(content)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load Who We Are page.')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [])

  function setField(field: WhoWeArePageField, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaveError(null)
    setSuccess(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    const payload = normalizeWhoWeArePageContent(form)
    const missing = (Object.keys(FIELD_LABELS) as WhoWeArePageField[])
      .find((field) => payload[field] === '')

    if (missing) {
      setSaveError(`${FIELD_LABELS[missing]} is required.`)
      setSuccess(null)
      return
    }

    setSaving(true)
    setSaveError(null)
    setSuccess(null)

    try {
      const saved = await updateAdminWhoWeArePage(payload)
      setForm(saved)
      setSuccess('Who We Are page saved.')
      toast.success('Who We Are page saved.')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save Who We Are page.')
    } finally {
      setSaving(false)
    }
  }

  const disabled = loading || saving

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Who We Are Page</h1>
        <p className="text-sm text-muted-foreground mt-1">Landing page about copy</p>
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

      <form onSubmit={handleSubmit} className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15">
            <FileText className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Who We Are Page</h2>
            <p className="text-xs text-muted-foreground">Text fields only</p>
          </div>
        </div>

        <div className="space-y-6 p-5">
          {loading ? (
            <WhoWeArePageFormSkeleton />
          ) : (
            <>
              <FormSection title="Page header">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    id="who-we-are-page-eyebrow"
                    label="Page eyebrow"
                    value={form.eyebrow}
                    onChange={(value) => setField('eyebrow', value)}
                    disabled={disabled}
                  />
                  <TextField
                    id="who-we-are-page-title"
                    label="Page title"
                    value={form.title}
                    onChange={(value) => setField('title', value)}
                    disabled={disabled}
                  />
                </div>
              </FormSection>

              <ContentSection
                title="Who Are We"
                labelId="who-we-are-page-who-are-we-label"
                bodyId="who-we-are-page-who-are-we-body"
                label={form.whoAreWeLabel}
                body={form.whoAreWeBody}
                disabled={disabled}
                onLabelChange={(value) => setField('whoAreWeLabel', value)}
                onBodyChange={(value) => setField('whoAreWeBody', value)}
              />

              <ContentSection
                title="Review Philosophy"
                labelId="who-we-are-page-review-philosophy-label"
                bodyId="who-we-are-page-review-philosophy-body"
                label={form.reviewPhilosophyLabel}
                body={form.reviewPhilosophyBody}
                disabled={disabled}
                onLabelChange={(value) => setField('reviewPhilosophyLabel', value)}
                onBodyChange={(value) => setField('reviewPhilosophyBody', value)}
              />

              <ContentSection
                title="Mission"
                labelId="who-we-are-page-mission-label"
                bodyId="who-we-are-page-mission-body"
                label={form.missionLabel}
                body={form.missionBody}
                disabled={disabled}
                onLabelChange={(value) => setField('missionLabel', value)}
                onBodyChange={(value) => setField('missionBody', value)}
              />

              <ContentSection
                title="Vision"
                labelId="who-we-are-page-vision-label"
                bodyId="who-we-are-page-vision-body"
                label={form.visionLabel}
                body={form.visionBody}
                disabled={disabled}
                onLabelChange={(value) => setField('visionLabel', value)}
                onBodyChange={(value) => setField('visionBody', value)}
              />
            </>
          )}
        </div>

        <div className="flex justify-end border-t px-5 py-4">
          <Button type="submit" disabled={disabled}>
            {saving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
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

function ContentSection({
  title,
  labelId,
  bodyId,
  label,
  body,
  disabled,
  onLabelChange,
  onBodyChange,
}: {
  title: string
  labelId: string
  bodyId: string
  label: string
  body: string
  disabled: boolean
  onLabelChange: (value: string) => void
  onBodyChange: (value: string) => void
}) {
  return (
    <FormSection title={title}>
      <TextField
        id={labelId}
        label="Section label"
        value={label}
        onChange={onLabelChange}
        disabled={disabled}
      />
      <TextareaField
        id={bodyId}
        label="Body text"
        value={body}
        onChange={onBodyChange}
        rows={5}
        disabled={disabled}
      />
    </FormSection>
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

function WhoWeArePageFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-4 w-28" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-4 border-t pt-5">
          <Skeleton className="h-4 w-36" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
