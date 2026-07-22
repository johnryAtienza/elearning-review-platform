import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, MessageCircle, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '../../features/admin/components/AdminTable'
import { toast } from '@/lib/toast'
import {
  getAdminContactPage,
  updateAdminContactPage,
} from '@s-class/api/admin.service'
import { DEFAULT_CONTACT_PAGE_CONTENT } from '@s-class/api/homeContentApi'
import type {
  ContactPageChannelContent,
  ContactPageContent,
} from '@s-class/types/home'

type ChannelKey = 'email' | 'phone' | 'messenger'
type BusinessHoursKey = keyof ContactPageContent['businessHours']

const CHANNEL_LABELS: Record<ChannelKey, string> = {
  email: 'Email card',
  phone: 'Phone card',
  messenger: 'Facebook Messenger card',
}

const BUSINESS_HOURS_LABELS: Record<BusinessHoursKey, string> = {
  weekdays: 'Monday-Friday hours',
  saturday: 'Saturday hours',
  sunday: 'Sunday status',
}

function normalizeChannel(channel: ContactPageChannelContent): ContactPageChannelContent {
  return {
    label: channel.label.trim(),
    value: channel.value.trim(),
    helper: channel.helper.trim(),
    href: channel.href.trim(),
  }
}

function normalizeContactPageContent(content: ContactPageContent): ContactPageContent {
  return {
    heroEyebrow: content.heroEyebrow.trim(),
    heroTitle: content.heroTitle.trim(),
    heroDescription: content.heroDescription.trim(),
    email: normalizeChannel(content.email),
    phone: normalizeChannel(content.phone),
    messenger: normalizeChannel(content.messenger),
    businessHours: {
      weekdays: content.businessHours.weekdays.trim(),
      saturday: content.businessHours.saturday.trim(),
      sunday: content.businessHours.sunday.trim(),
    },
  }
}

function findMissingField(content: ContactPageContent): string | null {
  if (!content.heroEyebrow) return 'Eyebrow is required.'
  if (!content.heroTitle) return 'Page title is required.'
  if (!content.heroDescription) return 'Page description is required.'

  for (const key of Object.keys(CHANNEL_LABELS) as ChannelKey[]) {
    const channel = content[key]
    if (!channel.label) return `${CHANNEL_LABELS[key]} label is required.`
    if (!channel.value) return `${CHANNEL_LABELS[key]} value is required.`
    if (!channel.helper) return `${CHANNEL_LABELS[key]} helper text is required.`
    if (!channel.href) return `${CHANNEL_LABELS[key]} link/action is required.`
  }

  for (const key of Object.keys(BUSINESS_HOURS_LABELS) as BusinessHoursKey[]) {
    if (!content.businessHours[key]) return `${BUSINESS_HOURS_LABELS[key]} is required.`
  }

  return null
}

export function AdminContactPage() {
  const [form,      setForm]      = useState<ContactPageContent>(DEFAULT_CONTACT_PAGE_CONTENT)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [success,   setSuccess]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setLoadError(null)
    getAdminContactPage()
      .then((content) => {
        if (!cancelled) {
          setForm(content)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load contact page.')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [])

  function setHeroField(
    field: 'heroEyebrow' | 'heroTitle' | 'heroDescription',
    value: string,
  ) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaveError(null)
    setSuccess(null)
  }

  function setChannelField(
    channelKey: ChannelKey,
    field: keyof ContactPageChannelContent,
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      [channelKey]: {
        ...prev[channelKey],
        [field]: value,
      },
    }))
    setSaveError(null)
    setSuccess(null)
  }

  function setBusinessHoursField(field: BusinessHoursKey, value: string) {
    setForm((prev) => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [field]: value,
      },
    }))
    setSaveError(null)
    setSuccess(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    const payload = normalizeContactPageContent(form)
    const missing = findMissingField(payload)

    if (missing) {
      setSaveError(missing)
      setSuccess(null)
      return
    }

    setSaving(true)
    setSaveError(null)
    setSuccess(null)

    try {
      const saved = await updateAdminContactPage(payload)
      setForm(saved)
      setSuccess('Contact page saved.')
      toast.success('Contact page saved.')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save contact page.')
    } finally {
      setSaving(false)
    }
  }

  const disabled = loading || saving

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contact Page</h1>
        <p className="text-sm text-muted-foreground mt-1">Landing page contact details and business hours</p>
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
            <MessageCircle className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Contact Page</h2>
            <p className="text-xs text-muted-foreground">Text, links, and hours only</p>
          </div>
        </div>

        <div className="space-y-6 p-5">
          {loading ? (
            <ContactPageFormSkeleton />
          ) : (
            <>
              <FormSection title="Page header">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    id="contact-page-eyebrow"
                    label="Eyebrow"
                    value={form.heroEyebrow}
                    onChange={(value) => setHeroField('heroEyebrow', value)}
                    disabled={disabled}
                  />
                  <TextField
                    id="contact-page-title"
                    label="Page title"
                    value={form.heroTitle}
                    onChange={(value) => setHeroField('heroTitle', value)}
                    disabled={disabled}
                  />
                </div>
                <TextareaField
                  id="contact-page-description"
                  label="Page description"
                  value={form.heroDescription}
                  onChange={(value) => setHeroField('heroDescription', value)}
                  rows={3}
                  disabled={disabled}
                />
              </FormSection>

              <ChannelSection
                title="Email card"
                channel={form.email}
                disabled={disabled}
                prefix="email"
                onChange={(field, value) => setChannelField('email', field, value)}
              />

              <ChannelSection
                title="Phone card"
                channel={form.phone}
                disabled={disabled}
                prefix="phone"
                onChange={(field, value) => setChannelField('phone', field, value)}
              />

              <ChannelSection
                title="Facebook Messenger card"
                channel={form.messenger}
                disabled={disabled}
                prefix="messenger"
                onChange={(field, value) => setChannelField('messenger', field, value)}
              />

              <FormSection title="Business hours">
                <div className="grid gap-4 sm:grid-cols-3">
                  <TextField
                    id="contact-page-weekdays"
                    label="Monday-Friday hours"
                    value={form.businessHours.weekdays}
                    onChange={(value) => setBusinessHoursField('weekdays', value)}
                    disabled={disabled}
                  />
                  <TextField
                    id="contact-page-saturday"
                    label="Saturday hours"
                    value={form.businessHours.saturday}
                    onChange={(value) => setBusinessHoursField('saturday', value)}
                    disabled={disabled}
                  />
                  <TextField
                    id="contact-page-sunday"
                    label="Sunday status"
                    value={form.businessHours.sunday}
                    onChange={(value) => setBusinessHoursField('sunday', value)}
                    disabled={disabled}
                  />
                </div>
              </FormSection>
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

function ChannelSection({
  title,
  channel,
  disabled,
  prefix,
  onChange,
}: {
  title: string
  channel: ContactPageChannelContent
  disabled: boolean
  prefix: string
  onChange: (field: keyof ContactPageChannelContent, value: string) => void
}) {
  return (
    <FormSection title={title}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id={`contact-page-${prefix}-label`}
          label="Label"
          value={channel.label}
          onChange={(value) => onChange('label', value)}
          disabled={disabled}
        />
        <TextField
          id={`contact-page-${prefix}-value`}
          label={prefix === 'email' ? 'Email address' : prefix === 'phone' ? 'Phone number' : 'Messenger handle/link'}
          value={channel.value}
          onChange={(value) => onChange('value', value)}
          disabled={disabled}
        />
      </div>
      <TextareaField
        id={`contact-page-${prefix}-helper`}
        label={prefix === 'phone' ? 'Helper text / schedule' : 'Helper text'}
        value={channel.helper}
        onChange={(value) => onChange('helper', value)}
        rows={2}
        disabled={disabled}
      />
      <TextField
        id={`contact-page-${prefix}-href`}
        label="Link/action"
        value={channel.href}
        onChange={(value) => onChange('href', value)}
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

function ContactPageFormSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="space-y-4 border-t pt-5 first:border-t-0 first:pt-0">
          <Skeleton className="h-4 w-32" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
