import { useEffect, useRef, useState } from 'react'
import { UpgradeOverlay } from './UpgradeOverlay'

interface VideoPlayerProps {
  title: string
  thumbnail: string   // Tailwind gradient classes — used as poster background
  durationSeconds?: number
  /** Presigned R2 URL. When present, renders a real <video> element. */
  src?: string
  onEnded: () => void
  /**
   * Free-tier preview limit in seconds.
   * When set, the video stops at this time and shows an upgrade prompt.
   * `onEnded` is NOT called — use `onPreviewEnded` instead.
   */
  previewDuration?: number
  /** Called when the preview limit is reached (free tier). */
  onPreviewEnded?: () => void
  /**
   * Called with the current watch percentage (0–100).
   * For free-tier previews the percentage is relative to the preview duration,
   * so 95 means the user has watched 95% of the allowed preview window.
   */
  onProgress?: (percent: number) => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VideoPlayer({
  title, thumbnail, durationSeconds = 30, src, onEnded,
  previewDuration, onPreviewEnded, onProgress,
}: VideoPlayerProps) {
  const isPreviewMode = typeof previewDuration === 'number'

  if (src) {
    return (
      <RealVideoPlayer
        title={title}
        src={src}
        onEnded={onEnded}
        previewDuration={isPreviewMode ? previewDuration : undefined}
        onPreviewEnded={onPreviewEnded}
        onProgress={onProgress}
      />
    )
  }

  return (
    <MockVideoPlayer
      title={title}
      thumbnail={thumbnail}
      durationSeconds={durationSeconds}
      onEnded={onEnded}
      previewDuration={isPreviewMode ? previewDuration : undefined}
      onPreviewEnded={onPreviewEnded}
      onProgress={onProgress}
    />
  )
}

// ── Real video player ─────────────────────────────────────────────────────────

interface RealVideoPlayerProps {
  title: string
  src: string
  onEnded: () => void
  previewDuration?: number
  onPreviewEnded?: () => void
  onProgress?: (percent: number) => void
}

function RealVideoPlayer({ title, src, onEnded, previewDuration, onPreviewEnded, onProgress }: RealVideoPlayerProps) {
  const videoRef       = useRef<HTMLVideoElement>(null)
  const [error, setError]             = useState(false)
  const [previewEnded, setPreviewEnded] = useState(false)
  const previewFiredRef = useRef(false)

  useEffect(() => {
    setError(false)
    setPreviewEnded(false)
    previewFiredRef.current = false
  }, [src])

  function handleTimeUpdate() {
    const video = videoRef.current
    if (!video) return

    // Emit progress relative to effective playable duration
    if (video.duration) {
      const effectiveDuration = previewDuration ?? video.duration
      const pct = Math.min(Math.round((video.currentTime / effectiveDuration) * 100), 100)
      onProgress?.(pct)
    }

    // Preview boundary check
    if (!previewDuration || previewFiredRef.current) return
    if (video.currentTime >= previewDuration) {
      previewFiredRef.current = true
      video.pause()
      setPreviewEnded(true)
      onPreviewEnded?.()
    }
  }

  if (error) {
    return (
      <div className="rounded-xl overflow-hidden border shadow-sm">
        <div className="aspect-video bg-muted flex flex-col items-center justify-center gap-2">
          <p className="text-sm text-muted-foreground">Failed to load video.</p>
          <p className="text-xs text-muted-foreground">The signed URL may have expired.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden border shadow-sm">
      <div className="bg-black/80 px-4 py-2 flex items-center justify-between">
        <p className="text-white text-sm font-medium truncate">{title}</p>
        {previewDuration && (
          <span className="text-xs text-amber-400 font-medium shrink-0 ml-3">
            {previewEnded ? 'Preview ended' : `${formatTime(previewDuration)} preview`}
          </span>
        )}
      </div>

      <div className="relative">
        <video
          ref={videoRef}
          src={src}
          controls={!previewEnded}
          controlsList="nodownload"
          className="w-full aspect-video bg-black"
          onEnded={onEnded}
          onError={() => setError(true)}
          onTimeUpdate={handleTimeUpdate}
          onContextMenu={(e) => e.preventDefault()}
        />

        {previewEnded && (
          <div className="relative aspect-video bg-black">
            <UpgradeOverlay
              title="Preview ended"
              description={`Free plan includes the first ${formatTime(previewDuration!)} of each video. Upgrade to Standard for full access.`}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Mock / demo video player ──────────────────────────────────────────────────

interface MockVideoPlayerProps {
  title: string
  thumbnail: string
  durationSeconds: number
  onEnded: () => void
  previewDuration?: number
  onPreviewEnded?: () => void
  onProgress?: (percent: number) => void
}

function MockVideoPlayer({
  title, thumbnail, durationSeconds, onEnded,
  previewDuration, onPreviewEnded, onProgress,
}: MockVideoPlayerProps) {
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused' | 'ended' | 'preview_ended'>('idle')
  const [currentTime, setCurrentTime] = useState(0)
  const intervalRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasEndedRef     = useRef(false)
  const hasPreviewedRef = useRef(false)

  // Effective stop time: preview limit takes priority over full duration
  const stopAt      = previewDuration ?? durationSeconds
  const progress    = Math.min((currentTime / durationSeconds) * 100, 100)
  // Progress relative to effective playable window (for the 95% threshold)
  const progressPct = Math.min(Math.round((currentTime / stopAt) * 100), 100)

  // Notify parent of progress changes
  useEffect(() => {
    onProgress?.(progressPct)
  }, [progressPct]) // eslint-disable-line react-hooks/exhaustive-deps

  function clearTick() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  function play() {
    if (status === 'ended' || status === 'preview_ended') return
    setStatus('playing')
  }

  function pause() { setStatus('paused') }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    // Free-tier: prevent seeking past the preview boundary
    const rect  = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const time  = Math.max(0, Math.min(ratio * durationSeconds, durationSeconds))
    const capped = previewDuration ? Math.min(time, previewDuration) : time
    setCurrentTime(capped)
    if (capped >= durationSeconds) handleEnd()
  }

  function handleEnd() {
    if (hasEndedRef.current) return
    hasEndedRef.current = true
    clearTick()
    setStatus('ended')
    setCurrentTime(durationSeconds)
    onEnded()
  }

  function handlePreviewEnd() {
    if (hasPreviewedRef.current) return
    hasPreviewedRef.current = true
    clearTick()
    setStatus('preview_ended')
    setCurrentTime(previewDuration!)
    onPreviewEnded?.()
  }

  useEffect(() => {
    if (status !== 'playing') { clearTick(); return }

    intervalRef.current = setInterval(() => {
      setCurrentTime((t) => {
        const next = t + 0.25

        // Preview boundary
        if (previewDuration && next >= previewDuration) {
          handlePreviewEnd()
          return previewDuration
        }

        // Full end
        if (next >= durationSeconds) {
          handleEnd()
          return durationSeconds
        }

        return next
      })
    }, 250)

    return clearTick
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, durationSeconds, previewDuration])

  const isPlaying      = status === 'playing'
  const isEnded        = status === 'ended'
  const isPreviewEnded = status === 'preview_ended'

  return (
    <div className="rounded-xl overflow-hidden border shadow-sm select-none">

      {/* Thumbnail / preview area */}
      <div className={`relative bg-linear-to-br ${thumbnail} aspect-video flex flex-col items-center justify-center`}>
        {/* Title bar */}
        <div className="absolute inset-x-0 top-0 bg-linear-to-b from-black/50 to-transparent p-4 flex items-center justify-between">
          <p className="text-white text-sm font-medium truncate">{title}</p>
          {previewDuration && !isPreviewEnded && (
            <span className="text-xs text-amber-400 font-medium shrink-0 ml-3 bg-black/40 rounded px-1.5 py-0.5">
              {formatTime(previewDuration)} preview
            </span>
          )}
        </div>

        {/* Idle / paused */}
        {!isPlaying && !isEnded && !isPreviewEnded && (
          <button
            onClick={play}
            aria-label="Play"
            className="rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-sm p-5 transition-colors"
          >
            <PlayIcon className="size-10 text-white" />
          </button>
        )}

        {/* Playing */}
        {isPlaying && (
          <button
            onClick={pause}
            aria-label="Pause"
            className="rounded-full bg-transparent hover:bg-black/20 p-5 transition-colors opacity-0 hover:opacity-100"
          >
            <PauseIcon className="size-10 text-white" />
          </button>
        )}

        {/* Fully completed */}
        {isEnded && (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-white/20 p-4 backdrop-blur-sm">
              <CheckIcon className="size-10 text-white" />
            </div>
            <p className="text-white text-sm font-medium">Video complete</p>
          </div>
        )}

        {/* Preview ended — upgrade overlay */}
        {isPreviewEnded && (
          <UpgradeOverlay
            title="Preview ended"
            description={`Free plan includes the first ${formatTime(previewDuration!)} of each video. Upgrade to Standard for full access.`}
          />
        )}
      </div>

      {/* Controls bar */}
      <div className="bg-card px-4 pt-3 pb-4 space-y-2">
        {/* Progress bar */}
        <div className="relative">
          {/* Preview limit marker */}
          {previewDuration && previewDuration < durationSeconds && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10 rounded-full"
              style={{ left: `${(previewDuration / durationSeconds) * 100}%` }}
              title={`Free preview limit: ${formatTime(previewDuration)}`}
            />
          )}
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            onClick={seek}
            className="h-1.5 bg-muted rounded-full cursor-pointer group relative"
          >
            <div
              className={[
                'h-full rounded-full transition-all relative',
                isPreviewEnded ? 'bg-amber-400' : 'bg-primary',
              ].join(' ')}
              style={{ width: `${progress}%` }}
            >
              <span className="absolute -right-1.5 -top-1 size-3.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {!isPlaying ? (
              <button
                onClick={isEnded || isPreviewEnded ? undefined : play}
                disabled={isEnded || isPreviewEnded}
                aria-label="Play"
                className="rounded p-1 hover:bg-muted transition-colors disabled:opacity-40"
              >
                <PlayIcon className="size-4" />
              </button>
            ) : (
              <button onClick={pause} aria-label="Pause" className="rounded p-1 hover:bg-muted transition-colors">
                <PauseIcon className="size-4" />
              </button>
            )}
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatTime(currentTime)} / {formatTime(durationSeconds)}
            </span>
          </div>

          {!isEnded && !isPreviewEnded && (
            <button
              onClick={handleEnd}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip to end ↓
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}
