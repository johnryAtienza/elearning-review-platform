import { useEffect, useMemo, useRef, useState } from 'react'
import { FileText, Loader2, Lock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PdfViewer } from '@/features/lessons/components/PdfViewer'
import { effectiveDay, effectiveWeek } from './curriculum'
import { getSignedSolutionUrl, SecureContentFetchError } from '@s-class/api/secureContent'
import type { Lesson } from '@/features/lessons/types'

interface PdfSolutionsSectionProps {
  lessons: Lesson[]
}

interface SolutionGroup {
  bookId: string
  bookTitle: string
  lessons: Lesson[]
}

export function PdfSolutionsSection({ lessons }: PdfSolutionsSectionProps) {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [solutionUrl, setSolutionUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const groups = useMemo<SolutionGroup[]>(() => {
    const byBook = new Map<string, SolutionGroup>()

    for (const lesson of lessons) {
      if (!lesson.hasSolutionPdf || !lesson.solutionBookId || !lesson.solutionBookTitle) continue
      const group = byBook.get(lesson.solutionBookId) ?? {
        bookId: lesson.solutionBookId,
        bookTitle: lesson.solutionBookTitle,
        lessons: [],
      }
      group.lessons.push(lesson)
      byBook.set(lesson.solutionBookId, group)
    }

    return [...byBook.values()]
      .map((group) => ({
        ...group,
        lessons: [...group.lessons].sort((a, b) => (
          effectiveWeek(a) - effectiveWeek(b) ||
          effectiveDay(a) - effectiveDay(b) ||
          a.order - b.order ||
          a.id.localeCompare(b.id)
        )),
      }))
      .sort((a, b) => (
        effectiveWeek(a.lessons[0]!) - effectiveWeek(b.lessons[0]!) ||
        effectiveDay(a.lessons[0]!) - effectiveDay(b.lessons[0]!) ||
        a.bookTitle.localeCompare(b.bookTitle)
      ))
  }, [lessons])

  useEffect(() => {
    if (!selectedLesson) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeViewer()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  })

  function closeViewer() {
    requestId.current += 1
    setSelectedLesson(null)
    setSolutionUrl(null)
    setError(null)
    setLoading(false)
  }

  async function openSolution(lesson: Lesson) {
    const currentRequest = ++requestId.current
    setSelectedLesson(lesson)
    setSolutionUrl(null)
    setError(null)
    setLoading(true)

    try {
      const url = await getSignedSolutionUrl(lesson.id)
      if (currentRequest !== requestId.current) return
      setSolutionUrl(url)
    } catch (err) {
      if (currentRequest !== requestId.current) return
      setError(getSolutionErrorMessage(err))
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }

  if (groups.length === 0) return null

  return (
    <>
      <section className="space-y-4" aria-labelledby="pdf-solutions-heading">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="pdf-solutions-heading" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              PDF Solutions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Access requires the associated book purchase or Standard access.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group) => (
            <div key={group.bookId} className="rounded-2xl border bg-card p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <FileText className="size-5" />
                </div>
                <h3 className="font-semibold leading-snug">{group.bookTitle} Solutions</h3>
              </div>

              <div className="space-y-2">
                {group.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => void openSolution(lesson)}
                    className="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={`Open ${group.bookTitle} Day ${effectiveDay(lesson)} solution`}
                  >
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        Day {effectiveDay(lesson)} - Solutions
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {lesson.title}
                      </span>
                    </span>
                    <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="solution-viewer-title"
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border bg-background shadow-xl"
          >
            <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
              <p id="solution-viewer-title" className="flex-1 truncate text-sm font-semibold">
                Day {effectiveDay(selectedLesson)} - Solutions
              </p>
              <Button variant="ghost" size="icon" className="size-8" onClick={closeViewer} aria-label="Close PDF viewer">
                <X className="size-4" />
              </Button>
            </div>

            <div className="overflow-y-auto p-4">
              {loading && (
                <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                  Opening solution PDF…
                </div>
              )}
              {error && (
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
                  <p className="max-w-md text-sm text-destructive">{error}</p>
                  <Button variant="outline" onClick={() => void openSolution(selectedLesson)}>
                    Try again
                  </Button>
                </div>
              )}
              {solutionUrl && !loading && !error && (
                <PdfViewer
                  src={solutionUrl}
                  title={`Day ${effectiveDay(selectedLesson)} - Solutions`}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function getSolutionErrorMessage(error: unknown): string {
  if (error instanceof SecureContentFetchError) {
    if (error.code === 'UNAUTHORIZED') return 'Please sign in to open this solution PDF.'
    if (error.code === 'NO_SUBSCRIPTION') {
      return 'This PDF is available to users who purchased the associated book or have active Standard access.'
    }
    if (error.code === 'LESSON_NOT_FOUND') return 'This solution PDF is no longer available.'
  }
  return 'Unable to open this solution PDF. Please try again.'
}
