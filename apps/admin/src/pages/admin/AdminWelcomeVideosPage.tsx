import { useState, useEffect, useCallback } from 'react'
import { PlayCircle, Eye, EyeOff, Loader2, Pencil, Trash2, Plus, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { WelcomeVideoModal } from '../../features/admin/components/WelcomeVideoModal'
import {
  AdminTableHeader, AdminTableSearch, EmptyState, DeleteConfirmRow, ADMIN_ROW_BASE, Tip, LoadError,
  matchesAdminSearch,
  type ColConfig,
} from '../../features/admin/components/AdminTable'
import {
  getAdminWelcomeVideos,
  setWelcomeVideoEnabled,
  deleteAdminWelcomeVideo,
  type AdminWelcomeVideo,
} from '@s-class/api/admin.service'
import { toast } from '@/lib/toast'

const GRID_COLS = 'grid-cols-[3rem_1fr_5rem_5rem_9rem]'

const HEADER_COLS: ColConfig[] = [
  { label: 'Thumb',    smOnly: true },
  { label: 'Video' },
  { label: 'Order',    center: true, smOnly: true },
  { label: 'Status',   center: true },
  { label: 'Actions',  center: true },
]

type ModalState =
  | { open: false }
  | { open: true; video: AdminWelcomeVideo | null }

export function AdminWelcomeVideosPage() {
  const [items,     setItems]     = useState<AdminWelcomeVideo[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toggling,  setToggling]  = useState<Set<string>>(new Set())
  const [deleting,  setDeleting]  = useState<Set<string>>(new Set())
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [modal,     setModal]     = useState<ModalState>({ open: false })
  const [search,    setSearch]    = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    getAdminWelcomeVideos()
      .then((data) => { setItems(data); setLoading(false) })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load welcome videos.')
        setLoading(false)
      })
  }, [])

  useEffect(() => { load() }, [load])

  async function handleToggleEnabled(v: AdminWelcomeVideo) {
    setToggling((prev) => new Set(prev).add(v.id))
    try {
      await setWelcomeVideoEnabled(v.id, !v.enabled)
      setItems((prev) => prev.map((x) => x.id === v.id ? { ...x, enabled: !v.enabled } : x))
      toast.success(!v.enabled ? `"${v.title}" enabled` : `"${v.title}" disabled`)
    } catch (err) {
      toast.error(err, 'Failed to update welcome video.')
    } finally {
      setToggling((prev) => { const s = new Set(prev); s.delete(v.id); return s })
    }
  }

  async function handleDelete(v: AdminWelcomeVideo) {
    setDeleting((prev) => new Set(prev).add(v.id))
    setConfirmId(null)
    try {
      await deleteAdminWelcomeVideo(v.id)
      setItems((prev) => prev.filter((x) => x.id !== v.id))
      toast.success(`"${v.title}" deleted`)
    } catch (err) {
      toast.error(err, 'Failed to delete welcome video.')
    } finally {
      setDeleting((prev) => { const s = new Set(prev); s.delete(v.id); return s })
    }
  }

  function handleSaved(saved: AdminWelcomeVideo, isEdit: boolean) {
    setItems((prev) => {
      const exists = prev.some((x) => x.id === saved.id)
      return exists
        ? prev.map((x) => x.id === saved.id ? saved : x)
        : [saved, ...prev]
    })
    setModal({ open: false })
    toast.success(isEdit ? `"${saved.title}" updated` : `"${saved.title}" created`)
  }

  // The first enabled row in display order is the one rendered publicly.
  const activeId = items
    .filter((v) => v.enabled)
    .sort((a, b) => a.displayOrder - b.displayOrder || (a.createdAt < b.createdAt ? 1 : -1))[0]?.id

  const enabledCount = items.filter((v) => v.enabled).length
  const filtered = items.filter((video) => matchesAdminSearch(search, [
    video.title,
    video.videoUrl,
    video.displayOrder,
    getWelcomeVideoStatus(video, activeId),
  ]))

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome Videos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading
              ? 'Loading…'
              : `${items.length} total · ${enabledCount} enabled · 1 shown on homepage`}
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, video: null })}>
          <Plus className="mr-2 size-4" />
          New Welcome Video
        </Button>
      </div>

      <AdminTableSearch value={search} onChange={setSearch} placeholder="Search welcome videos…" />

      <LoadError message={loadError} />

      <div className="rounded-xl border shadow-sm overflow-hidden">
        <AdminTableHeader cols={HEADER_COLS} gridCols={GRID_COLS} />

        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <Skeleton className="hidden sm:block size-10 rounded-md shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="hidden sm:block h-4 w-6" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-7 w-20 rounded-md" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={PlayCircle}
            title="No welcome videos yet"
            description="Add a video to show on the homepage."
            action={
              <Button size="sm" onClick={() => setModal({ open: true, video: null })}>
                <Plus className="mr-2 size-4" />
                New Welcome Video
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={PlayCircle}
            title="No results found"
            description="Try a different search."
          />
        ) : (
          <div className="divide-y">
            {filtered.map((v) => (
              <WelcomeVideoRow
                key={v.id}
                video={v}
                isActive={activeId === v.id}
                isToggling={toggling.has(v.id)}
                isDeleting={deleting.has(v.id)}
                isConfirmingDelete={confirmId === v.id}
                onEdit={() => setModal({ open: true, video: v })}
                onToggleEnabled={() => handleToggleEnabled(v)}
                onConfirmDelete={() => setConfirmId(v.id)}
                onCancelDelete={() => setConfirmId(null)}
                onDelete={() => handleDelete(v)}
              />
            ))}
          </div>
        )}
      </div>

      {modal.open && (
        <WelcomeVideoModal
          video={modal.video}
          onClose={() => setModal({ open: false })}
          onSaved={(saved) => handleSaved(saved, modal.video !== null)}
        />
      )}
    </div>
  )
}

interface RowProps {
  video: AdminWelcomeVideo
  isActive: boolean
  isToggling: boolean
  isDeleting: boolean
  isConfirmingDelete: boolean
  onEdit: () => void
  onToggleEnabled: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onDelete: () => void
}

function WelcomeVideoRow({
  video, isActive, isToggling, isDeleting, isConfirmingDelete,
  onEdit, onToggleEnabled, onConfirmDelete, onCancelDelete, onDelete,
}: RowProps) {
  const status = getWelcomeVideoStatus(video, isActive ? video.id : undefined)

  return (
    <div className="divide-y">
      <div className={`${ADMIN_ROW_BASE} ${GRID_COLS}`}>

        <div className="hidden sm:flex w-12 shrink-0">
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="size-10 rounded-md border object-cover bg-muted"
            />
          ) : (
            <div className="size-10 rounded-md border bg-muted flex items-center justify-center">
              <ImageIcon className="size-5 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{video.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">{video.videoUrl}</p>
        </div>

        <span className="hidden sm:flex justify-center text-sm tabular-nums text-muted-foreground">
          {video.displayOrder}
        </span>

        <span className="flex justify-center">
          {status === 'Disabled' ? (
            <Badge variant="secondary">Disabled</Badge>
          ) : status === 'Live' ? (
            <Badge variant="success">Live</Badge>
          ) : (
            <Badge variant="outline">Standby</Badge>
          )}
        </span>

        <div className="flex items-center justify-end gap-1">
          <Tip label={video.enabled ? 'Disable' : 'Enable'}>
            <Button
              variant="ghost" size="icon" className="size-8"
              disabled={isToggling || isDeleting}
              onClick={onToggleEnabled}
            >
              {isToggling
                ? <Loader2 className="size-4 animate-spin" />
                : video.enabled
                  ? <EyeOff className="size-4" />
                  : <Eye className="size-4" />}
            </Button>
          </Tip>
          <Tip label="Edit welcome video">
            <Button
              variant="ghost" size="icon" className="size-8"
              disabled={isDeleting} onClick={onEdit}
            >
              <Pencil className="size-4" />
            </Button>
          </Tip>
          <Tip label="Delete welcome video" align="right">
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
          message={<>Delete <strong>"{video.title}"</strong>?</>}
          onConfirm={onDelete}
          onCancel={onCancelDelete}
        />
      )}
    </div>
  )
}

function getWelcomeVideoStatus(video: AdminWelcomeVideo, activeId: string | undefined): 'Disabled' | 'Live' | 'Standby' {
  if (!video.enabled) return 'Disabled'
  return activeId === video.id ? 'Live' : 'Standby'
}
