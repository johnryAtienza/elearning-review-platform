import { useEffect, useRef, useState } from 'react'

interface VideoPlayerProps {
  title: string
  thumbnail: string   // Tailwind gradient classes — used as poster background
  durationSeconds?: number
  /** Presigned R2 URL. When present, renders a real <video> element. */
  src?: string
  onEnded: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VideoPlayer({ title, thumbnail, durationSeconds = 30, src, onEnded }: VideoPlayerProps) {
  // ── Real video mode ──────────────────────────────────────────────────────────
  if (src) {
    return <RealVideoPlayer title={title} src={src} onEnded={onEnded} />
  }

  // ── Mock / demo mode ─────────────────────────────────────────────────────────
  return (
    <MockVideoPlayer
      title={title}
      thumbnail={thumbnail}
      durationSeconds={durationSeconds}
      onEnded={onEnded}
    />
  )
}

// ── Real video player ─────────────────────────────────────────────────────────

interface RealVideoPlayerProps {
  title: string
  src: string
  onEnded: () => void
}

function RealVideoPlayer({ title, src, onEnded }: RealVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState(false)

  // Reset error state if the src changes (e.g. refreshed signed URL)
  useEffect(() => { setError(false) }, [src])

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
      {/* Title bar */}
      <div className="bg-black/80 px-4 py-2">
        <p className="text-white text-sm font-medium truncate">{title}</p>
      </div>
      {/* Native video — browser controls handle play/pause/seek/fullscreen */}
      <video
        ref={videoRef}
        src={src}
        controls
        controlsList="nodownload"
        className="w-full aspect-video bg-black"
        onEnded={onEnded}
        onError={() => setError(true)}
        // Prevent right-click context menu to discourage direct URL extraction
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  )
}

// ── Mock / demo video player ──────────────────────────────────────────────────

interface MockVideoPlayerProps {
  title: string
  thumbnail: string
  durationSeconds: number
  onEnded: () => void
}

function MockVideoPlayer({ title, thumbnail, durationSeconds, onEnded }: MockVideoPlayerProps) {
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused' | 'ended'>('idle')
  const [currentTime, setCurrentTime] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasEndedRef = useRef(false)

  const progress = Math.min((currentTime / durationSeconds) * 100, 100)

  function clearTick() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  function play() {
    if (status === 'ended') return
    setStatus('playing')
  }

  function pause() {
    setStatus('paused')
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const time = Math.max(0, Math.min(ratio * durationSeconds, durationSeconds))
    setCurrentTime(time)
    if (time >= durationSeconds) handleEnd()
  }

  function handleEnd() {
    if (hasEndedRef.current) return
    hasEndedRef.current = true
    clearTick()
    setStatus('ended')
    setCurrentTime(durationSeconds)
    onEnded()
  }

  useEffect(() => {
    if (status !== 'playing') {
      clearTick()
      return
    }
    intervalRef.current = setInterval(() => {
      setCurrentTime((t) => {
        const next = t + 0.25
        if (next >= durationSeconds) {
          handleEnd()
          return durationSeconds
        }
        return next
      })
    }, 250)
    return clearTick
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, durationSeconds])

  const isPlaying = status === 'playing'
  const isEnded = status === 'ended'

  return (
    <div className="rounded-xl overflow-hidden border shadow-sm select-none">
      <div className={`relative bg-linear-to-br ${thumbnail} aspect-video flex flex-col items-center justify-center`}>
        <div className="absolute inset-x-0 top-0 bg-linear-to-b from-black/50 to-transparent p-4">
          <p className="text-white text-sm font-medium truncate">{title}</p>
        </div>

        {!isPlaying && !isEnded && (
          <button
            onClick={play}
            aria-label="Play"
            className="rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-sm p-5 transition-colors"
          >
            <PlayIcon className="size-10 text-white" />
          </button>
        )}

        {isPlaying && (
          <button
            onClick={pause}
            aria-label="Pause"
            className="rounded-full bg-transparent hover:bg-black/20 p-5 transition-colors opacity-0 hover:opacity-100"
          >
            <PauseIcon className="size-10 text-white" />
          </button>
        )}

        {isEnded && (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-white/20 p-4 backdrop-blur-sm">
              <CheckIcon className="size-10 text-white" />
            </div>
            <p className="text-white text-sm font-medium">Video complete</p>
          </div>
        )}
      </div>

      <div className="bg-card px-4 pt-3 pb-4 space-y-2">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          onClick={seek}
          className="h-1.5 bg-muted rounded-full cursor-pointer group relative"
        >
          <div
            className="h-full bg-primary rounded-full transition-all relative"
            style={{ width: `${progress}%` }}
          >
            <span className="absolute -right-1.5 -top-1 size-3.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {!isPlaying ? (
              <button
                onClick={isEnded ? undefined : play}
                disabled={isEnded}
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

          {!isEnded && (
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
