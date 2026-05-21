import { useState, useEffect, useCallback } from 'react'
import { Bell, Eye, EyeOff, Loader2, Pencil, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AnnouncementModal } from '@/features/admin/components/AnnouncementModal'
import {
  AdminTableHeader, EmptyState, DeleteConfirmRow, ADMIN_ROW_BASE, Tip, LoadError, formatAdminDate,
  type ColConfig,
} from '@/features/admin/components/AdminTable'
import {
  getAdminAnnouncements,
  setAnnouncementEnabled,
  deleteAdminAnnouncement,
  type AdminAnnouncement,
} from '@/services/admin.service'
import { toast } from '@/lib/toast'

const GRID_COLS = 'grid-cols-[1fr_8rem_5rem_5rem_9rem]'

const HEADER_COLS: ColConfig[] = [
  { label: 'Announcement' },
  { label: 'Publish date', center: true, smOnly: true },
  { label: 'Order',        center: true, smOnly: true },
  { label: 'Status',       center: true },
  { label: 'Actions',      center: true },
]

type ModalState =
  | { open: false }
  | { open: true; announcement: AdminAnnouncement | null }

export function AdminAnnouncementsPage() {
  const [items,     setItems]     = useState<AdminAnnouncement[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toggling,  setToggling]  = useState<Set<string>>(new Set())
  const [deleting,  setDeleting]  = useState<Set<string>>(new Set())
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [modal,     setModal]     = useState<ModalState>({ open: false })

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    getAdminAnnouncements()
      .then((data) => { setItems(data); setLoading(false) })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load announcements.')
        setLoading(false)
      })
  }, [])

  useEffect(() => { load() }, [load])

  async function handleToggleEnabled(a: AdminAnnouncement) {
    setToggling((prev) => new Set(prev).add(a.id))
    try {
      await setAnnouncementEnabled(a.id, !a.enabled)
      setItems((prev) => prev.map((x) => x.id === a.id ? { ...x, enabled: !a.enabled } : x))
      toast.success(!a.enabled ? `"${a.title}" enabled` : `"${a.title}" disabled`)
    } catch (err) {
      toast.error(err, 'Failed to update announcement.')
    } finally {
      setToggling((prev) => { const s = new Set(prev); s.delete(a.id); return s })
    }
  }

  async function handleDelete(a: AdminAnnouncement) {
    setDeleting((prev) => new Set(prev).add(a.id))
    setConfirmId(null)
    try {
      await deleteAdminAnnouncement(a.id)
      setItems((prev) => prev.filter((x) => x.id !== a.id))
      toast.success(`"${a.title}" deleted`)
    } catch (err) {
      toast.error(err, 'Failed to delete announcement.')
    } finally {
      setDeleting((prev) => { const s = new Set(prev); s.delete(a.id); return s })
    }
  }

  function handleSaved(saved: AdminAnnouncement, isEdit: boolean) {
    setItems((prev) => {
      const exists = prev.some((x) => x.id === saved.id)
      return exists
        ? prev.map((x) => x.id === saved.id ? saved : x)
        : [saved, ...prev]
    })
    setModal({ open: false })
    toast.success(isEdit ? `"${saved.title}" updated` : `"${saved.title}" created`)
  }

  const enabledCount = items.filter((a) => a.enabled).length

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? 'Loading…' : `${items.length} total · ${enabledCount} enabled`}
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, announcement: null })}>
          <Plus className="mr-2 size-4" />
          New Announcement
        </Button>
      </div>

      <LoadError message={loadError} />

      <div className="rounded-xl border shadow-sm overflow-hidden">
        <AdminTableHeader cols={HEADER_COLS} gridCols={GRID_COLS} />

        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="hidden sm:block h-4 w-20" />
                <Skeleton className="hidden sm:block h-4 w-6" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-7 w-20 rounded-md" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No announcements yet"
            description="Add your first homepage announcement."
            action={
              <Button size="sm" onClick={() => setModal({ open: true, announcement: null })}>
                <Plus className="mr-2 size-4" />
                New Announcement
              </Button>
            }
          />
        ) : (
          <div className="divide-y">
            {items.map((a) => (
              <AnnouncementRow
                key={a.id}
                announcement={a}
                isToggling={toggling.has(a.id)}
                isDeleting={deleting.has(a.id)}
                isConfirmingDelete={confirmId === a.id}
                onEdit={() => setModal({ open: true, announcement: a })}
                onToggleEnabled={() => handleToggleEnabled(a)}
                onConfirmDelete={() => setConfirmId(a.id)}
                onCancelDelete={() => setConfirmId(null)}
                onDelete={() => handleDelete(a)}
              />
            ))}
          </div>
        )}
      </div>

      {modal.open && (
        <AnnouncementModal
          announcement={modal.announcement}
          onClose={() => setModal({ open: false })}
          onSaved={(saved) => handleSaved(saved, modal.announcement !== null)}
        />
      )}
    </div>
  )
}

interface RowProps {
  announcement: AdminAnnouncement
  isToggling: boolean
  isDeleting: boolean
  isConfirmingDelete: boolean
  onEdit: () => void
  onToggleEnabled: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onDelete: () => void
}

function AnnouncementRow({
  announcement, isToggling, isDeleting, isConfirmingDelete,
  onEdit, onToggleEnabled, onConfirmDelete, onCancelDelete, onDelete,
}: RowProps) {
  const isFuture = new Date(announcement.publishedAt).getTime() > Date.now()

  return (
    <div className="divide-y">
      <div className={`${ADMIN_ROW_BASE} ${GRID_COLS}`}>

        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{announcement.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-md">
            {announcement.body || <span className="italic text-muted-foreground/50">No body</span>}
          </p>
        </div>

        <span className="hidden sm:flex justify-center text-xs tabular-nums text-muted-foreground">
          {formatAdminDate(announcement.publishedAt)}
        </span>

        <span className="hidden sm:flex justify-center text-sm tabular-nums text-muted-foreground">
          {announcement.displayOrder}
        </span>

        <span className="flex justify-center">
          {!announcement.enabled ? (
            <Badge variant="secondary">Disabled</Badge>
          ) : isFuture ? (
            <Badge variant="outline">Scheduled</Badge>
          ) : (
            <Badge variant="success">Live</Badge>
          )}
        </span>

        <div className="flex items-center justify-end gap-1">
          <Tip label={announcement.enabled ? 'Disable' : 'Enable'}>
            <Button
              variant="ghost" size="icon" className="size-8"
              disabled={isToggling || isDeleting}
              onClick={onToggleEnabled}
            >
              {isToggling
                ? <Loader2 className="size-4 animate-spin" />
                : announcement.enabled
                  ? <EyeOff className="size-4" />
                  : <Eye className="size-4" />}
            </Button>
          </Tip>
          <Tip label="Edit announcement">
            <Button
              variant="ghost" size="icon" className="size-8"
              disabled={isDeleting} onClick={onEdit}
            >
              <Pencil className="size-4" />
            </Button>
          </Tip>
          <Tip label="Delete announcement" align="right">
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
          message={<>Delete <strong>"{announcement.title}"</strong>?</>}
          onConfirm={onDelete}
          onCancel={onCancelDelete}
        />
      )}
    </div>
  )
}
