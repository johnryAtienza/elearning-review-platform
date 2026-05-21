import { useState, useRef } from 'react'
import { X, Upload, ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { uploadToStorage } from '@/services/storageClient'
import { storagePaths } from '@/services/storagePaths'
import {
  createAdminWelcomeVideo,
  updateAdminWelcomeVideo,
  type AdminWelcomeVideo,
} from '@/services/admin.service'
import { UPLOAD_LIMITS } from '@/constants/upload'
import { cn } from '@/utils/cn'

interface WelcomeVideoModalProps {
  video: AdminWelcomeVideo | null
  onClose: () => void
  onSaved: (v: AdminWelcomeVideo) => void
}

export function WelcomeVideoModal({ video, onClose, onSaved }: WelcomeVideoModalProps) {
  const isEdit = video !== null

  const [title,         setTitle]         = useState(video?.title       ?? '')
  const [description,   setDescription]   = useState(video?.description ?? '')
  const [videoUrl,      setVideoUrl]      = useState(video?.videoUrl    ?? '')
  const [thumbFile,     setThumbFile]     = useState<File | null>(null)
  const [thumbPreview,  setThumbPreview]  = useState<string | null>(video?.thumbnailUrl ?? null)
  const [ctaLabel,      setCtaLabel]      = useState(video?.ctaLabel ?? '')
  const [ctaHref,       setCtaHref]       = useState(video?.ctaHref  ?? '')
  const [enabled,       setEnabled]       = useState(video?.enabled ?? true)
  const [displayOrder,  setDisplayOrder]  = useState<number>(video?.displayOrder ?? 0)
  const [saving,        setSaving]        = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error,         setError]         = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > UPLOAD_LIMITS.IMAGE) {
      setError('Image must be under 5 MB.')
      return
    }
    setThumbFile(file)
    setThumbPreview(URL.createObjectURL(file))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    const t = title.trim()
    if (!t) { setError('Title is required.'); return }
    const url = videoUrl.trim()
    if (!url) { setError('Video URL is required.'); return }

    const tLabel = ctaLabel.trim()
    const tHref  = ctaHref.trim()
    if ((tLabel === '') !== (tHref === '')) {
      setError('CTA needs both a label and a link, or neither.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // 1. Create-or-update the row first so we have an ID for the upload key.
      let saved: AdminWelcomeVideo
      if (isEdit) {
        saved = await updateAdminWelcomeVideo(video.id, {
          title:        t,
          description:  description.trim(),
          videoUrl:     url,
          ctaLabel:     tLabel || null,
          ctaHref:      tHref  || null,
          enabled,
          displayOrder,
        })
      } else {
        saved = await createAdminWelcomeVideo({
          title:        t,
          description:  description.trim(),
          videoUrl:     url,
          thumbnailUrl: null,
          ctaLabel:     tLabel || null,
          ctaHref:      tHref  || null,
          enabled,
          displayOrder,
        })
      }

      // 2. Upload thumbnail if a new file was picked.
      if (thumbFile) {
        const ext  = thumbFile.name.split('.').pop() ?? 'webp'
        const path = storagePaths.welcomeVideoThumbnail(saved.id, ext)
        const result = await uploadToStorage(thumbFile, path, (evt) => {
          setUploadProgress(evt.percent)
        })
        saved = await updateAdminWelcomeVideo(saved.id, { thumbnailUrl: result.publicUrl })
      }

      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save welcome video.')
    } finally {
      setSaving(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={saving ? undefined : onClose} />

      <div className="relative w-full max-w-lg rounded-xl border bg-background shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Welcome Video' : 'New Welcome Video'}
          </h2>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="space-y-5 px-6 py-5">

            {/* Thumbnail */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Thumbnail</label>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                className={cn(
                  'relative flex h-44 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors',
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                      <Upload className="size-5 text-white" />
                      <span className="text-xs font-medium text-white">Change thumbnail</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImageIcon className="size-8" />
                    <p className="text-center text-xs">
                      Click to upload
                      <br />
                      <span className="text-muted-foreground/60">JPG, PNG, WebP · max 5 MB</span>
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-[11px] text-muted-foreground">
                Used as a poster image for direct MP4 videos. Ignored for YouTube/Vimeo embeds (which provide their own).
              </p>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label htmlFor="wv-title" className="text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                id="wv-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Why S Class?"
                disabled={saving}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="wv-desc" className="text-sm font-medium">Description</label>
              <textarea
                id="wv-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="One or two sentences below the video."
                rows={3}
                disabled={saving}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Video URL */}
            <div className="space-y-1.5">
              <label htmlFor="wv-url" className="text-sm font-medium">
                Video URL <span className="text-destructive">*</span>
              </label>
              <Input
                id="wv-url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=… or https://… .mp4"
                disabled={saving}
              />
              <p className="text-[11px] text-muted-foreground">YouTube, Vimeo, or a direct MP4 URL.</p>
            </div>

            {/* CTA + order */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="wv-cta-label" className="text-sm font-medium">CTA label</label>
                <Input
                  id="wv-cta-label"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder="Learn more"
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="wv-cta-href" className="text-sm font-medium">CTA link</label>
                <Input
                  id="wv-cta-href"
                  value={ctaHref}
                  onChange={(e) => setCtaHref(e.target.value)}
                  placeholder="/about"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="wv-order" className="text-sm font-medium">Display order</label>
              <Input
                id="wv-order"
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value) || 0)}
                disabled={saving}
              />
              <p className="text-[11px] text-muted-foreground">
                Only the enabled row with the lowest order is shown on the homepage.
              </p>
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
              <span>Enabled (eligible to appear on the public homepage)</span>
            </label>

            {/* Upload progress */}
            {saving && uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uploading thumbnail…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="shrink-0 flex justify-end gap-2 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create welcome video'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
