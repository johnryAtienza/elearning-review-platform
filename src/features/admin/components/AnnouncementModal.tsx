import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  createAdminAnnouncement,
  updateAdminAnnouncement,
  type AdminAnnouncement,
} from '@/services/admin.service'

interface AnnouncementModalProps {
  /** null = create mode, non-null = edit mode */
  announcement: AdminAnnouncement | null
  onClose: () => void
  onSaved: (a: AdminAnnouncement) => void
}

/** Convert an ISO timestamp → 'YYYY-MM-DDTHH:mm' for <input type="datetime-local"> */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInputValue(local: string): string {
  // Treat the user's local time as their wall clock; convert to UTC ISO.
  const d = new Date(local)
  return d.toISOString()
}

export function AnnouncementModal({ announcement, onClose, onSaved }: AnnouncementModalProps) {
  const isEdit = announcement !== null

  const [title,        setTitle]        = useState(announcement?.title ?? '')
  const [body,         setBody]         = useState(announcement?.body  ?? '')
  const [publishedAt,  setPublishedAt]  = useState(
    announcement ? toLocalInputValue(announcement.publishedAt) : toLocalInputValue(new Date().toISOString()),
  )
  const [enabled,      setEnabled]      = useState(announcement?.enabled ?? true)
  const [ctaLabel,     setCtaLabel]     = useState(announcement?.ctaLabel ?? '')
  const [ctaHref,      setCtaHref]      = useState(announcement?.ctaHref  ?? '')
  const [icon,         setIcon]         = useState(announcement?.icon     ?? '')
  const [category,     setCategory]     = useState(announcement?.category ?? '')
  const [displayOrder, setDisplayOrder] = useState<number>(announcement?.displayOrder ?? 0)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    const trimmedTitle = title.trim()
    if (!trimmedTitle) { setError('Title is required.'); return }
    if (!publishedAt)  { setError('Publish date is required.'); return }

    // CTA must be both-or-neither (matches the DB CHECK).
    const tLabel = ctaLabel.trim()
    const tHref  = ctaHref.trim()
    if ((tLabel === '') !== (tHref === '')) {
      setError('CTA needs both a label and a link, or neither.')
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      title:        trimmedTitle,
      body:         body.trim(),
      publishedAt:  fromLocalInputValue(publishedAt),
      enabled,
      ctaLabel:     tLabel || null,
      ctaHref:      tHref  || null,
      icon:         icon.trim()     || null,
      category:     category.trim() || null,
      displayOrder,
    }

    try {
      const saved = isEdit
        ? await updateAdminAnnouncement(announcement.id, payload)
        : await createAdminAnnouncement(payload)
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save announcement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={saving ? undefined : onClose} />

      <div className="relative w-full max-w-lg rounded-xl border bg-background shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Announcement' : 'New Announcement'}
          </h2>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="space-y-5 px-6 py-5">

            {/* Title */}
            <div className="space-y-1.5">
              <label htmlFor="ann-title" className="text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                id="ann-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. May intake now open"
                disabled={saving}
              />
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <label htmlFor="ann-body" className="text-sm font-medium">Body</label>
              <textarea
                id="ann-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Short description. Plain text; keep it to 1–3 sentences."
                rows={4}
                disabled={saving}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Publish date + display order */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="ann-published-at" className="text-sm font-medium">
                  Publish at <span className="text-destructive">*</span>
                </label>
                <Input
                  id="ann-published-at"
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                  disabled={saving}
                />
                <p className="text-[11px] text-muted-foreground">Future dates schedule the post.</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="ann-order" className="text-sm font-medium">Display order</label>
                <Input
                  id="ann-order"
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value) || 0)}
                  disabled={saving}
                />
                <p className="text-[11px] text-muted-foreground">Lower = higher on the page.</p>
              </div>
            </div>

            {/* CTA */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="ann-cta-label" className="text-sm font-medium">CTA label</label>
                <Input
                  id="ann-cta-label"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder="Enrol now"
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="ann-cta-href" className="text-sm font-medium">CTA link</label>
                <Input
                  id="ann-cta-href"
                  value={ctaHref}
                  onChange={(e) => setCtaHref(e.target.value)}
                  placeholder="/register"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Icon + category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="ann-icon" className="text-sm font-medium">Icon</label>
                <Input
                  id="ann-icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="lucide name (optional)"
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="ann-category" className="text-sm font-medium">Category</label>
                <Input
                  id="ann-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. eng-math"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Enabled */}
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                disabled={saving}
                className="size-4 rounded border-input"
              />
              <span>Enabled (visible on the public homepage when publish date has passed)</span>
            </label>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="shrink-0 flex justify-end gap-2 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create announcement'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
