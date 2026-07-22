import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Loader2,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '../../features/admin/components/AdminTable'
import { toast } from '@/lib/toast'
import {
  getAdminContactPage,
  updateAdminContactPage,
  type AdminContactChannel,
  type AdminContactPageContent,
} from '@s-class/api/admin.service'
import { DEFAULT_CONTACT_PAGE_CONTENT } from '@s-class/api/homeContentApi'
import type { ContactChannelIcon } from '@s-class/types/home'

type BusinessHoursKey = keyof AdminContactPageContent['businessHours']
type ContactChannelModalState =
  | { mode: 'add'; channel: AdminContactChannel }
  | { mode: 'edit'; channel: AdminContactChannel }

const BUSINESS_HOURS_LABELS: Record<BusinessHoursKey, string> = {
  weekdays: 'Monday-Friday hours',
  saturday: 'Saturday hours',
  sunday: 'Sunday status',
}

const ICON_OPTIONS: Array<{ value: ContactChannelIcon; label: string }> = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'messenger', label: 'Messenger' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'link', label: 'Link' },
]

const EMPTY_CONTENT: AdminContactPageContent = {
  heroEyebrow: DEFAULT_CONTACT_PAGE_CONTENT.heroEyebrow,
  heroTitle: DEFAULT_CONTACT_PAGE_CONTENT.heroTitle,
  heroDescription: DEFAULT_CONTACT_PAGE_CONTENT.heroDescription,
  channels: DEFAULT_CONTACT_PAGE_CONTENT.channels.map((channel) => ({
    ...channel,
    isActive: true,
    createdAt: null,
    updatedAt: null,
  })),
  businessHours: { ...DEFAULT_CONTACT_PAGE_CONTENT.businessHours },
}

function createChannel(sortOrder: number): AdminContactChannel {
  return {
    id: crypto.randomUUID(),
    label: '',
    value: '',
    helper: '',
    href: '',
    icon: 'link',
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

function normalizeChannel(channel: AdminContactChannel, index: number): AdminContactChannel {
  return {
    ...channel,
    label: channel.label.trim(),
    value: channel.value.trim(),
    helper: channel.helper.trim(),
    href: channel.href.trim(),
    sortOrder: index,
  }
}

function normalizeContactPageContent(content: AdminContactPageContent): AdminContactPageContent {
  return {
    heroEyebrow: content.heroEyebrow.trim(),
    heroTitle: content.heroTitle.trim(),
    heroDescription: content.heroDescription.trim(),
    channels: content.channels.map(normalizeChannel),
    businessHours: {
      weekdays: content.businessHours.weekdays.trim(),
      saturday: content.businessHours.saturday.trim(),
      sunday: content.businessHours.sunday.trim(),
    },
  }
}

function findMissingField(content: AdminContactPageContent): string | null {
  if (!content.heroEyebrow) return 'Eyebrow is required.'
  if (!content.heroTitle) return 'Page title is required.'
  if (!content.heroDescription) return 'Page description is required.'

  for (const [index, channel] of content.channels.entries()) {
    const label = channel.label || `Contact card ${index + 1}`
    if (!channel.label) return `${label} needs a label.`
    if (!channel.value) return `${label} needs a value.`
    if (!channel.helper) return `${label} needs helper text.`
    if (!channel.href) return `${label} needs a link/action URL.`
  }

  for (const key of Object.keys(BUSINESS_HOURS_LABELS) as BusinessHoursKey[]) {
    if (!content.businessHours[key]) return `${BUSINESS_HOURS_LABELS[key]} is required.`
  }

  return null
}

export function AdminContactPage() {
  const [form,      setForm]      = useState<AdminContactPageContent>(EMPTY_CONTENT)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [success,   setSuccess]   = useState<string | null>(null)
  const [channelModal, setChannelModal] = useState<ContactChannelModalState | null>(null)

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

  function updateForm(updater: (current: AdminContactPageContent) => AdminContactPageContent) {
    setForm(updater)
    setSaveError(null)
    setSuccess(null)
  }

  function setHeroField(
    field: 'heroEyebrow' | 'heroTitle' | 'heroDescription',
    value: string,
  ) {
    updateForm((current) => ({ ...current, [field]: value }))
  }

  function setChannel(
    channelId: string,
    nextChannel: AdminContactChannel,
  ) {
    updateForm((current) => ({
      ...current,
      channels: current.channels.map((channel) =>
        channel.id === channelId ? nextChannel : channel,
      ),
    }))
  }

  function openAddChannelModal() {
    setChannelModal({ mode: 'add', channel: createChannel(form.channels.length) })
  }

  function openEditChannelModal(channel: AdminContactChannel) {
    setChannelModal({ mode: 'edit', channel: { ...channel } })
  }

  function saveChannelFromModal(nextChannel: AdminContactChannel) {
    const normalizedChannel = {
      ...nextChannel,
      label: nextChannel.label.trim(),
      value: nextChannel.value.trim(),
      helper: nextChannel.helper.trim(),
      href: nextChannel.href.trim(),
    }

    updateForm((current) => {
      if (channelModal?.mode === 'edit') {
        return {
          ...current,
          channels: current.channels.map((channel) =>
            channel.id === normalizedChannel.id ? normalizedChannel : channel,
          ),
        }
      }

      return {
        ...current,
        channels: [
          ...current.channels,
          { ...normalizedChannel, sortOrder: current.channels.length },
        ],
      }
    })
    setChannelModal(null)
  }

  function removeChannel(channelId: string) {
    updateForm((current) => ({
      ...current,
      channels: current.channels.filter((channel) => channel.id !== channelId),
    }))
  }

  function moveChannel(index: number, direction: -1 | 1) {
    updateForm((current) => ({
      ...current,
      channels: moveItem(current.channels, index, direction),
    }))
  }

  function setBusinessHoursField(field: BusinessHoursKey, value: string) {
    updateForm((current) => ({
      ...current,
      businessHours: {
        ...current.businessHours,
        [field]: value,
      },
    }))
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
  const activeCount = form.channels.filter((channel) => channel.isActive).length

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contact Page</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? 'Loading...' : `${form.channels.length} contact cards / ${activeCount} active`}
          </p>
        </div>

        <Button type="button" variant="outline" onClick={openAddChannelModal} disabled={disabled}>
          <Plus className="mr-2 size-4" />
          Add Contact Card
        </Button>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b px-5 py-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15">
              <MessageCircle className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Page Header</h2>
              <p className="text-xs text-muted-foreground">Eyebrow, title, and description</p>
            </div>
          </div>

          <div className="space-y-5 p-5">
            {loading ? (
              <HeaderSkeleton />
            ) : (
              <>
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
              </>
            )}
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Contact Cards</h2>
              <p className="text-xs text-muted-foreground">Active cards show on the public Contact page</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={openAddChannelModal} disabled={disabled}>
              <Plus className="mr-2 size-4" />
              Add Contact Card
            </Button>
          </div>

          {loading ? (
            <ChannelsSkeleton />
          ) : form.channels.length === 0 ? (
            <div className="rounded-xl border py-14 text-center">
              <MessageCircle className="mx-auto size-10 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-medium">No contact cards</p>
              <Button type="button" size="sm" className="mt-4" onClick={openAddChannelModal}>
                <Plus className="mr-2 size-4" />
                Add Contact Card
              </Button>
            </div>
          ) : (
            form.channels.map((channel, index) => (
              <ChannelEditor
                key={channel.id}
                channel={channel}
                channelIndex={index}
                channelCount={form.channels.length}
                disabled={disabled}
                onChange={(nextChannel) => setChannel(channel.id, nextChannel)}
                onEdit={() => openEditChannelModal(channel)}
                onRemove={() => removeChannel(channel.id)}
                onMoveUp={() => moveChannel(index, -1)}
                onMoveDown={() => moveChannel(index, 1)}
              />
            ))
          )}
        </section>

        <section className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b px-5 py-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15">
              <MessageCircle className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Business Hours</h2>
              <p className="text-xs text-muted-foreground">Shown below the contact cards</p>
            </div>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
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
            )}
          </div>
        </section>

        <div className="flex justify-end">
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

      {channelModal && (
        <ContactChannelModal
          mode={channelModal.mode}
          channel={channelModal.channel}
          disabled={disabled}
          onClose={() => setChannelModal(null)}
          onSubmit={saveChannelFromModal}
        />
      )}
    </div>
  )
}

function ChannelEditor({
  channel,
  channelIndex,
  channelCount,
  disabled,
  onChange,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  channel: AdminContactChannel
  channelIndex: number
  channelCount: number
  disabled: boolean
  onChange: (channel: AdminContactChannel) => void
  onEdit: () => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const label = channel.label.trim() || `Contact card ${channelIndex + 1}`

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            {renderIcon(channel.icon, 'size-5 text-primary')}
          </span>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold">{label}</h3>
              <Badge variant={channel.isActive ? 'success' : 'secondary'}>
                {channel.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Sort order {channelIndex + 1}</p>
              <p className="truncate text-foreground">{channel.value || 'No value set'}</p>
              <p className="line-clamp-2">{channel.helper || 'No helper text set'}</p>
              <p className="truncate">{channel.href || 'No link/action URL set'}</p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
          <IconButton
            label="Edit contact card"
            disabled={disabled}
            onClick={onEdit}
            icon={<Pencil className="size-4" />}
          />
          <IconButton
            label="Move contact card up"
            disabled={disabled || channelIndex === 0}
            onClick={onMoveUp}
            icon={<ArrowUp className="size-4" />}
          />
          <IconButton
            label="Move contact card down"
            disabled={disabled || channelIndex === channelCount - 1}
            onClick={onMoveDown}
            icon={<ArrowDown className="size-4" />}
          />
          <IconButton
            label={channel.isActive ? 'Hide contact card' : 'Show contact card'}
            disabled={disabled}
            onClick={() => onChange({ ...channel, isActive: !channel.isActive })}
            icon={channel.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          />
          <IconButton
            label="Delete contact card"
            disabled={disabled}
            onClick={onRemove}
            icon={<Trash2 className="size-4" />}
            danger
          />
        </div>
      </div>
    </section>
  )
}

function ContactChannelModal({
  mode,
  channel,
  disabled,
  onClose,
  onSubmit,
}: {
  mode: 'add' | 'edit'
  channel: AdminContactChannel
  disabled: boolean
  onClose: () => void
  onSubmit: (channel: AdminContactChannel) => void
}) {
  const [draft, setDraft] = useState<AdminContactChannel>(channel)
  const [error, setError] = useState<string | null>(null)
  const inputIdPrefix = `contact-card-${mode}-${channel.id}`
  const modalTitle = mode === 'edit' ? 'Edit Contact Card' : 'Add Contact Card'
  const submitLabel = mode === 'edit' ? 'Update Contact Card' : 'Add Contact Card'

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      document.getElementById(`${inputIdPrefix}-label`)?.focus()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [inputIdPrefix])

  function patchDraft(patch: Partial<AdminContactChannel>) {
    setDraft((current) => ({ ...current, ...patch }))
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (disabled) return

    const nextChannel = {
      ...draft,
      label: draft.label.trim(),
      value: draft.value.trim(),
      helper: draft.helper.trim(),
      href: draft.href.trim(),
    }

    if (!nextChannel.label) {
      setError('Label is required.')
      return
    }
    if (!nextChannel.value) {
      setError('Value is required.')
      return
    }
    if (!nextChannel.helper) {
      setError('Helper text is required.')
      return
    }
    if (!nextChannel.href) {
      setError('Link/action URL is required.')
      return
    }

    onSubmit(nextChannel)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={disabled ? undefined : onClose} />

      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${inputIdPrefix}-modal-title`}
        onSubmit={handleSubmit}
        className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl border bg-background shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b px-6 py-4">
          <div>
            <h2 id={`${inputIdPrefix}-modal-title`} className="text-lg font-semibold">
              {modalTitle}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Contact card content, link, icon, and active status.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onClose} disabled={disabled}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id={`${inputIdPrefix}-label`}
              label="Label"
              value={draft.label}
              onChange={(value) => patchDraft({ label: value })}
              disabled={disabled}
            />
            <TextField
              id={`${inputIdPrefix}-value`}
              label="Value"
              value={draft.value}
              onChange={(value) => patchDraft({ value })}
              disabled={disabled}
            />
          </div>

          <TextareaField
            id={`${inputIdPrefix}-helper`}
            label="Helper text"
            value={draft.helper}
            onChange={(value) => patchDraft({ helper: value })}
            rows={3}
            disabled={disabled}
          />

          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <TextField
              id={`${inputIdPrefix}-href`}
              label="Link/action URL"
              value={draft.href}
              onChange={(value) => patchDraft({ href: value })}
              disabled={disabled}
            />
            <IconSelect
              id={`${inputIdPrefix}-icon`}
              value={draft.icon}
              onChange={(icon) => patchDraft({ icon })}
              disabled={disabled}
            />
          </div>

          <label className="flex items-start gap-3 rounded-lg border px-3 py-3 text-sm">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => patchDraft({ isActive: e.target.checked })}
              disabled={disabled}
              className="mt-0.5 size-4 rounded border-input"
            />
            <span>
              <span className="block font-medium">Active</span>
              <span className="block text-xs text-muted-foreground">
                Active cards show on the public Contact page.
              </span>
            </span>
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={disabled}>
            Cancel
          </Button>
          <Button type="submit" disabled={disabled}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

function IconSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string
  value: ContactChannelIcon
  onChange: (value: ContactChannelIcon) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        Icon type
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as ContactChannelIcon)}
        disabled={disabled}
        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {ICON_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function renderIcon(icon: ContactChannelIcon, className: string) {
  if (icon === 'email') return <Mail className={className} />
  if (icon === 'phone') return <Phone className={className} />
  if (icon === 'messenger') return <MessageCircle className={className} />
  return <LinkIcon className={className} />
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
      className={danger ? 'text-destructive hover:text-destructive' : undefined}
    >
      {icon}
    </Button>
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

function HeaderSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-24 w-full" />
    </div>
  )
}

function ChannelsSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
            <Skeleton className="h-8 w-36" />
          </div>
        </div>
      ))}
    </div>
  )
}
