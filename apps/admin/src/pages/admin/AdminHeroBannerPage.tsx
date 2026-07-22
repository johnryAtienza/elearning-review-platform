import { useEffect, useState } from 'react'
import { Loader2, Save, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '../../features/admin/components/AdminTable'
import { toast } from '@/lib/toast'
import {
  getAdminHomeHero,
  updateAdminHomeHero,
} from '@s-class/api/admin.service'
import { DEFAULT_HOME_HERO } from '@s-class/api/homeContentApi'
import type { HomeHeroContent } from '@s-class/types/home'

type HeroField = keyof HomeHeroContent

const FIELD_LABELS: Record<HeroField, string> = {
  eyebrow:         'Eyebrow text',
  title:           'Main headline',
  description:     'Supporting paragraph',
  primaryButton:   'Primary button label',
  secondaryButton: 'Secondary button label',
}

function normalizeHeroContent(content: HomeHeroContent): HomeHeroContent {
  return {
    eyebrow:         content.eyebrow.trim(),
    title:           content.title.trim(),
    description:     content.description.trim(),
    primaryButton:   content.primaryButton.trim(),
    secondaryButton: content.secondaryButton.trim(),
  }
}

export function AdminHeroBannerPage() {
  const [form,      setForm]      = useState<HomeHeroContent>(DEFAULT_HOME_HERO)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setLoadError(null)
    getAdminHomeHero()
      .then((content) => {
        if (!cancelled) {
          setForm(content)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load hero banner.')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [])

  function setField(field: HeroField, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaveError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    const payload = normalizeHeroContent(form)
    const missing = (Object.keys(FIELD_LABELS) as HeroField[])
      .find((field) => payload[field] === '')

    if (missing) {
      setSaveError(`${FIELD_LABELS[missing]} is required.`)
      return
    }

    setSaving(true)
    setSaveError(null)

    try {
      const saved = await updateAdminHomeHero(payload)
      setForm(saved)
      toast.success('Hero banner saved.')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save hero banner.')
    } finally {
      setSaving(false)
    }
  }

  const disabled = loading || saving

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hero Banner</h1>
        <p className="text-sm text-muted-foreground mt-1">Landing page banner text</p>
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
            <Type className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Landing Banner</h2>
            <p className="text-xs text-muted-foreground">Text fields only</p>
          </div>
        </div>

        <div className="space-y-5 p-5">
          {loading ? (
            <HeroFormSkeleton />
          ) : (
            <>
              <div className="space-y-1.5">
                <label htmlFor="hero-eyebrow" className="text-sm font-medium">
                  Eyebrow text
                </label>
                <Input
                  id="hero-eyebrow"
                  value={form.eyebrow}
                  onChange={(e) => setField('eyebrow', e.target.value)}
                  disabled={disabled}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="hero-title" className="text-sm font-medium">
                  Main headline
                </label>
                <textarea
                  id="hero-title"
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  rows={2}
                  disabled={disabled}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="hero-description" className="text-sm font-medium">
                  Supporting paragraph
                </label>
                <textarea
                  id="hero-description"
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  rows={4}
                  disabled={disabled}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="hero-primary-button" className="text-sm font-medium">
                    Primary button label
                  </label>
                  <Input
                    id="hero-primary-button"
                    value={form.primaryButton}
                    onChange={(e) => setField('primaryButton', e.target.value)}
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="hero-secondary-button" className="text-sm font-medium">
                    Secondary button label
                  </label>
                  <Input
                    id="hero-secondary-button"
                    value={form.secondaryButton}
                    onChange={(e) => setField('secondaryButton', e.target.value)}
                    disabled={disabled}
                  />
                </div>
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
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function HeroFormSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-28 w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}
