import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ImageIcon, Loader2, PlayCircle, Save, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '../../features/admin/components/AdminTable'
import { toast } from '@/lib/toast'
import { uploadToStorage } from '@s-class/api/storageClient'
import { storagePaths } from '@s-class/api/storagePaths'
import {
  createAdminWelcomeVideo,
  getAdminWelcomeVideos,
  updateAdminWelcomeVideo,
  type AdminWelcomeVideo,
} from '@s-class/api/admin.service'
import { UPLOAD_LIMITS } from '@/constants/upload'
import { cn } from '@/utils/cn'

interface WelcomeVideoForm {
  title: string
  description: string
  videoUrl: string
  thumbnailUrl: string | null
  ctaLabel: string
  ctaHref: string
  enabled: boolean
  displayOrder: number
}

type WelcomeVideoTextField = 'title' | 'description' | 'videoUrl' | 'ctaLabel' | 'ctaHref'

const EMPTY_WELCOME_VIDEO_FORM: WelcomeVideoForm = {
  title: '',
  description: '',
  videoUrl: '',
  thumbnailUrl: null,
  ctaLabel: '',
  ctaHref: '',
  enabled: true,
  displayOrder: 0,
}

function pickPrimaryVideo(videos: AdminWelcomeVideo[]): AdminWelcomeVideo | null {
  return videos.find((video) => video.enabled) ?? videos[0] ?? null
}

function toWelcomeVideoForm(video: AdminWelcomeVideo | null): WelcomeVideoForm {
  if (!video) return { ...EMPTY_WELCOME_VIDEO_FORM }

  return {
    title: video.title,
    description: video.description,
    videoUrl: video.videoUrl ?? '',
    thumbnailUrl: video.thumbnailUrl,
    ctaLabel: video.ctaLabel ?? '',
    ctaHref: video.ctaHref ?? '',
    enabled: video.enabled,
    displayOrder: video.displayOrder,
  }
}

export function AdminWelcomeVideosPage() {
  const [videoId,        setVideoId]        = useState<string | null>(null)
  const [form,           setForm]           = useState<WelcomeVideoForm>(EMPTY_WELCOME_VIDEO_FORM)
  const [loading,        setLoading]        = useState(true)
  const [saving,         setSaving]         = useState(false)
  const [loadError,      setLoadError]      = useState<string | null>(null)
  const [saveError,      setSaveError]      = useState<string | null>(null)
  const [success,        setSuccess]        = useState<string | null>(null)
  const [thumbFile,      setThumbFile]      = useState<File | null>(null)
  const [thumbPreview,   setThumbPreview]   = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setLoadError(null)
    getAdminWelcomeVideos()
      .then((videos) => {
        if (cancelled) return

        const primaryVideo = pickPrimaryVideo(videos)
        setVideoId(primaryVideo?.id ?? null)
        setForm(toWelcomeVideoForm(primaryVideo))
        setThumbFile(null)
        setThumbPreview(primaryVideo?.thumbnailUrl ?? null)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load welcome video.')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    return () => {
      if (thumbPreview?.startsWith('blob:')) URL.revokeObjectURL(thumbPreview)
    }
  }, [thumbPreview])

  function clearFeedback() {
    setSaveError(null)
    setSuccess(null)
  }

  function setTextField(field: WelcomeVideoTextField, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    clearFeedback()
  }

  function setEnabled(enabled: boolean) {
    setForm((prev) => ({ ...prev, enabled }))
    clearFeedback()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > UPLOAD_LIMITS.IMAGE) {
      setSaveError('Thumbnail must be under 5 MB.')
      setSuccess(null)
      return
    }

    setThumbFile(file)
    setThumbPreview(URL.createObjectURL(file))
    clearFeedback()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    const title = form.title.trim()
    const description = form.description.trim()
    const videoUrl = form.videoUrl.trim() || null
    const ctaLabel = form.ctaLabel.trim()
    const ctaHref = form.ctaHref.trim()

    if (!title) {
      setSaveError('Video title is required.')
      setSuccess(null)
      return
    }

    if ((ctaLabel === '') !== (ctaHref === '')) {
      setSaveError('CTA needs both a label and a link, or neither.')
      setSuccess(null)
      return
    }

    setSaving(true)
    setSaveError(null)
    setSuccess(null)

    try {
      let saved: AdminWelcomeVideo

      if (videoId) {
        saved = await updateAdminWelcomeVideo(videoId, {
          title,
          description,
          videoUrl,
          ctaLabel: ctaLabel || null,
          ctaHref: ctaHref || null,
          enabled: form.enabled,
          displayOrder: form.displayOrder,
        })
      } else {
        saved = await createAdminWelcomeVideo({
          title,
          description,
          videoUrl,
          thumbnailUrl: null,
          ctaLabel: ctaLabel || null,
          ctaHref: ctaHref || null,
          enabled: form.enabled,
          displayOrder: form.displayOrder,
        })
      }

      if (thumbFile) {
        const ext = thumbFile.name.split('.').pop() ?? 'webp'
        const path = storagePaths.welcomeVideoThumbnail(saved.id, ext)
        const result = await uploadToStorage(thumbFile, path, (evt) => {
          setUploadProgress(evt.percent)
        })
        saved = await updateAdminWelcomeVideo(saved.id, { thumbnailUrl: result.publicUrl })
      }

      setVideoId(saved.id)
      setForm(toWelcomeVideoForm(saved))
      setThumbFile(null)
      setThumbPreview(saved.thumbnailUrl)
      setSuccess('Welcome video saved.')
      toast.success('Welcome video saved.')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save welcome video.')
    } finally {
      setSaving(false)
      setUploadProgress(0)
    }
  }

  const disabled = loading || saving

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome Videos</h1>
        <p className="text-sm text-muted-foreground mt-1">Homepage welcome video content</p>
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
            <PlayCircle className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Welcome Video</h2>
            <p className="text-xs text-muted-foreground">Video, thumbnail, and CTA</p>
          </div>
        </div>

        <div className="space-y-5 p-5">
          {loading ? (
            <WelcomeVideoFormSkeleton />
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Thumbnail</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                  className={cn(
                    'relative flex h-44 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                    thumbPreview ? 'border-transparent' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
                  )}
                >
                  {thumbPreview ? (
                    <>
                      <img
                        src={thumbPreview}
                        alt="Thumbnail preview"
                        className="absolute inset-0 size-full object-cover"
                      />
                      <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                        <Upload className="size-5 text-white" />
                        <span className="text-xs font-medium text-white">Change thumbnail</span>
                      </span>
                    </>
                  ) : (
                    <span className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ImageIcon className="size-8" />
                      <span className="text-center text-xs">
                        Click to upload
                        <br />
                        <span className="text-muted-foreground/60">JPG, PNG, WebP - max 5 MB</span>
                      </span>
                    </span>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={disabled}
                  onChange={handleFileChange}
                />
                <p className="text-[11px] text-muted-foreground">
                  Used as a poster image for direct MP4 videos. YouTube and Vimeo provide their own preview images.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="welcome-video-title" className="text-sm font-medium">
                  Video title
                </label>
                <Input
                  id="welcome-video-title"
                  value={form.title}
                  onChange={(e) => setTextField('title', e.target.value)}
                  placeholder="Why S Class?"
                  disabled={disabled}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="welcome-video-description" className="text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="welcome-video-description"
                  value={form.description}
                  onChange={(e) => setTextField('description', e.target.value)}
                  rows={3}
                  placeholder="One or two sentences below the video."
                  disabled={disabled}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="welcome-video-url" className="text-sm font-medium">
                  Video URL
                </label>
                <Input
                  id="welcome-video-url"
                  value={form.videoUrl}
                  onChange={(e) => setTextField('videoUrl', e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or https://... .mp4"
                  disabled={disabled}
                />
                <p className="text-[11px] text-muted-foreground">
                  Leave blank to show the thumbnail only.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="welcome-video-cta-label" className="text-sm font-medium">
                    CTA label
                  </label>
                  <Input
                    id="welcome-video-cta-label"
                    value={form.ctaLabel}
                    onChange={(e) => setTextField('ctaLabel', e.target.value)}
                    placeholder="Learn more"
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="welcome-video-cta-link" className="text-sm font-medium">
                    CTA link
                  </label>
                  <Input
                    id="welcome-video-cta-link"
                    value={form.ctaHref}
                    onChange={(e) => setTextField('ctaHref', e.target.value)}
                    placeholder="/about"
                    disabled={disabled}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  disabled={disabled}
                  className="size-4 rounded border-input"
                />
                <span>Show on homepage</span>
              </label>

              {saving && uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Uploading thumbnail...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
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

function WelcomeVideoFormSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-44 w-full rounded-lg" />
        <Skeleton className="h-3 w-72 max-w-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <Skeleton className="h-5 w-36" />
    </div>
  )
}
