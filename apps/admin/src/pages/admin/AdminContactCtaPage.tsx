import { useEffect, useState } from 'react'
import { Loader2, Mail, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '../../features/admin/components/AdminTable'
import { toast } from '@/lib/toast'
import {
  getAdminLandingContactCta,
  updateAdminLandingContactCta,
} from '@s-class/api/admin.service'
import { DEFAULT_LANDING_CONTACT_CTA } from '@s-class/api/homeContentApi'
import type { LandingContactCtaContent } from '@s-class/types/home'

type ContactCtaField = keyof LandingContactCtaContent

const FIELD_LABELS: Record<ContactCtaField, string> = {
  title:       'CTA title',
  description: 'CTA description',
  buttonLabel: 'CTA button label',
}

function normalizeContactCtaContent(
  content: LandingContactCtaContent,
): LandingContactCtaContent {
  return {
    title:       content.title.trim(),
    description: content.description.trim(),
    buttonLabel: content.buttonLabel.trim(),
  }
}

export function AdminContactCtaPage() {
  const [form,      setForm]      = useState<LandingContactCtaContent>(DEFAULT_LANDING_CONTACT_CTA)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setLoadError(null)
    getAdminLandingContactCta()
      .then((content) => {
        if (!cancelled) {
          setForm(content)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load contact CTA.')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [])

  function setField(field: ContactCtaField, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaveError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    const payload = normalizeContactCtaContent(form)
    const missing = (Object.keys(FIELD_LABELS) as ContactCtaField[])
      .find((field) => payload[field] === '')

    if (missing) {
      setSaveError(`${FIELD_LABELS[missing]} is required.`)
      return
    }

    setSaving(true)
    setSaveError(null)

    try {
      const saved = await updateAdminLandingContactCta(payload)
      setForm(saved)
      toast.success('Contact CTA saved.')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save contact CTA.')
    } finally {
      setSaving(false)
    }
  }

  const disabled = loading || saving

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contact CTA</h1>
        <p className="text-sm text-muted-foreground mt-1">Landing page contact call-to-action text</p>
      </div>

      <LoadError message={loadError} />

      {saveError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {saveError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15">
            <Mail className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Contact CTA</h2>
            <p className="text-xs text-muted-foreground">Text fields only</p>
          </div>
        </div>

        <div className="space-y-5 p-5">
          {loading ? (
            <ContactCtaFormSkeleton />
          ) : (
            <>
              <div className="space-y-1.5">
                <label htmlFor="contact-cta-title" className="text-sm font-medium">
                  CTA title
                </label>
                <Input
                  id="contact-cta-title"
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  disabled={disabled}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contact-cta-description" className="text-sm font-medium">
                  CTA description
                </label>
                <textarea
                  id="contact-cta-description"
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  rows={4}
                  disabled={disabled}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contact-cta-button-label" className="text-sm font-medium">
                  CTA button label
                </label>
                <Input
                  id="contact-cta-button-label"
                  value={form.buttonLabel}
                  onChange={(e) => setField('buttonLabel', e.target.value)}
                  disabled={disabled}
                />
              </div>
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

function ContactCtaFormSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-28 w-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}
