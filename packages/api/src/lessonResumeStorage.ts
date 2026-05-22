/**
 * lessonResumeStorage.ts
 *
 * Local-only persistence of per-lesson video playback position so a user who
 * loses connection (or closes the tab) mid-video can resume where they left
 * off instead of being forced to restart — important now that forward seeking
 * is locked until a lesson is marked watched.
 *
 * Storage is browser-local (localStorage). Cross-device resume is intentionally
 * not addressed here.
 */

const KEY_PREFIX = 'lesson-resume:'
const MIN_SAVE_SECONDS = 5
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

interface ResumeEntry {
  t: number
  savedAt: string
}

function key(lessonId: string): string {
  return `${KEY_PREFIX}${lessonId}`
}

export function saveResume(lessonId: string, seconds: number): void {
  if (seconds < MIN_SAVE_SECONDS) return
  try {
    const entry: ResumeEntry = { t: seconds, savedAt: new Date().toISOString() }
    localStorage.setItem(key(lessonId), JSON.stringify(entry))
  } catch {
    // localStorage can throw in private mode or when quota is exceeded
  }
}

export function loadResume(lessonId: string): number | null {
  pruneOldEntries()
  try {
    const raw = localStorage.getItem(key(lessonId))
    if (!raw) return null
    const entry = JSON.parse(raw) as ResumeEntry
    return typeof entry.t === 'number' && entry.t >= MIN_SAVE_SECONDS ? entry.t : null
  } catch {
    return null
  }
}

export function clearResume(lessonId: string): void {
  try {
    localStorage.removeItem(key(lessonId))
  } catch {
    // ignore
  }
}

function pruneOldEntries(): void {
  try {
    const cutoff = Date.now() - MAX_AGE_MS
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(KEY_PREFIX)) continue
      try {
        const entry = JSON.parse(localStorage.getItem(k) ?? '{}') as ResumeEntry
        if (!entry.savedAt || new Date(entry.savedAt).getTime() < cutoff) {
          localStorage.removeItem(k)
        }
      } catch {
        localStorage.removeItem(k)
      }
    }
  } catch {
    // ignore
  }
}
