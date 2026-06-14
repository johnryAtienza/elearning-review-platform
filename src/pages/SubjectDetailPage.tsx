import { useState, useEffect, useMemo } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import {
  Clock, BookOpen, Tag, ChevronLeft, Play,
  Bookmark, BookmarkCheck, CalendarClock, PlusCircle, EyeOff, Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { SubjectThumbnail } from '@/components/SubjectThumbnail'
import { useAuthStore } from '@/store/authStore'
import { useSavedSubjectsStore } from '@/store/savedCoursesStore'
import { subjectApi } from '@/services/subjectApi'
import { lessonApi } from '@/services/lessonApi'
import { groupLessonsByWeek, WeekBlock } from '@/features/subjects/components/curriculum'
import { ROUTES } from '@/constants/routes'
import { getAbsoluteUrl } from '@s-class/constants/urls'
import type { Subject } from '@/features/subjects/types'
import type { Lesson } from '@/features/lessons/types'

interface SubjectDetailPageProps {
  /**
   * Render as Landing's public preview funnel. Guests browse the curriculum,
   * "Watch Free Preview" routes to /preview/lesson/:id (Landing), "Enroll"
   * CTAs link to /register. Authenticated paths (Save to
   * Dashboard, Start First Lesson for subscribers) are hidden.
   */
  previewMode?: boolean
}

export function SubjectDetailPage({ previewMode = false }: SubjectDetailPageProps = {}) {
  // Same component can be mounted at legacy or preview URLs:
  //   • /course/:courseId            (legacy redirect compatibility)
  //   • /preview/subject/:subjectId  (Landing preview funnel)
  // Either param is the parent subject's id.
  const params = useParams<{ courseId?: string; subjectId?: string }>()
  const subjectId = params.courseId ?? params.subjectId
  const { isAuthenticated, isSubscribed, isAdmin } = useAuthStore()
  const isSaved = useSavedSubjectsStore((s) => subjectId ? s.isSaved(subjectId) : false)
  const toggle  = useSavedSubjectsStore((s) => s.toggle)
  const [saving, setSaving] = useState(false)

  async function handleToggleSave() {
    if (!subjectId || saving) return
    setSaving(true)
    try { await toggle(subjectId) } finally { setSaving(false) }
  }

  const [subject, setSubject] = useState<Subject | undefined>()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalDuration = useMemo(() => {
    const total = lessons.reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0)
    if (total === 0) return null
    const h = Math.floor(total / 60)
    const m = total % 60
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }, [lessons])

  const weekGroups = useMemo(() => groupLessonsByWeek(lessons), [lessons])

  useEffect(() => {
    if (!subjectId) return
    let cancelled = false
    setLoading(true)
    setError(null)

    const fetchSubject = isAdmin ? subjectApi.getByIdAdmin(subjectId) : subjectApi.getById(subjectId)
    Promise.all([fetchSubject, lessonApi.getBySubject(subjectId)])
      .then(([s, ls]) => {
        if (cancelled) return
        if (!s) { setNotFound(true) } else { setSubject(s); setLessons(ls) }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load subject.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [subjectId, isAdmin])

  if (notFound) return <Navigate to="/" replace />
  if (error) return <ErrorMessage message={error} />

  if (loading || !subject) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  const firstLesson = lessons[0]
  // Preview CTA is offered when the first lesson is flagged is_free_preview.
  // The flag is server-authoritative, so this stays accurate as marketing
  // changes which lessons are free without a code deploy.
  const firstLessonIsPreview = firstLesson?.isFreePreview === true

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="size-4" />
        Home
      </Link>

      {/* ── Draft preview banner (admin only) ── */}
      {isAdmin && subject.isPublished === false && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3">
          <div className="flex items-center gap-2.5 text-sm text-warning">
            <EyeOff className="size-4 shrink-0" />
            <span>
              <span className="font-semibold">Draft Preview</span>
              {' '}— this subject is not visible to students yet.
            </span>
          </div>
          <Link
            to="/admin/courses"
            className="shrink-0 text-xs font-medium text-warning hover:underline inline-flex items-center gap-1"
          >
            <Pencil className="size-3" />
            Edit
          </Link>
        </div>
      )}

      {/* ── Subject banner ── */}
      <SubjectBanner subject={subject} />

      {/* ── Title + meta + actions ── */}
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
            {subject.title}
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-3xl">
            {subject.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BookOpen className="size-4" />
            {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
          </span>
          {totalDuration && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" />
              {totalDuration}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Tag className="size-4" />
            {subject.category}
          </span>
          {isAuthenticated && (
            <span className={
              isSubscribed
                ? 'inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary'
                : 'inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning'
            }>
              {isSubscribed ? 'Standard Plan' : 'Free Plan'}
            </span>
          )}
        </div>

        {/* Action row */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {previewMode && firstLesson ? (
            // Landing preview funnel — no auth assumed. "Watch Free Preview"
            // only when the first lesson is flagged; "Enroll Now" links to
            // same-origin /register.
            <>
              {firstLessonIsPreview && (
                <Button asChild>
                  <Link to={ROUTES.PREVIEW_LESSON(firstLesson.id)}>
                    <Play className="size-4 mr-1.5" />
                    Watch Free Preview
                  </Link>
                </Button>
              )}
              <Button asChild variant={firstLessonIsPreview ? 'outline' : 'default'}>
                <a href={getAbsoluteUrl(withReturnParam(ROUTES.REGISTER, ROUTES.SUBJECT(subject.id)))}>Enroll Now</a>
              </Button>
            </>
          ) : !isAdmin && firstLesson && (
            isSubscribed ? (
              <Button asChild>
                <Link to={ROUTES.LESSON(firstLesson.id)}>
                  <Play className="size-4 mr-1.5" />
                  Start First Lesson
                </Link>
              </Button>
            ) : firstLessonIsPreview ? (
              <>
                <Button asChild>
                  <Link to={ROUTES.LESSON(firstLesson.id)}>
                    <Play className="size-4 mr-1.5" />
                    Watch Free Preview
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to={isAuthenticated ? ROUTES.SUBSCRIPTION : ROUTES.REGISTER}>
                    Enroll Now
                  </Link>
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link to={isAuthenticated ? ROUTES.SUBSCRIPTION : ROUTES.REGISTER}>
                  Enroll Now
                </Link>
              </Button>
            )
          )}

          {!previewMode && isAuthenticated && !isAdmin && (
            <Button
              variant={isSaved ? 'secondary' : 'outline'}
              onClick={handleToggleSave}
              disabled={saving}
            >
              {isSaved
                ? <><BookmarkCheck className="size-4 mr-1.5" /> Saved</>
                : <><Bookmark className="size-4 mr-1.5" /> Save to Dashboard</>
              }
            </Button>
          )}
        </div>
      </header>

      {/* ── Curriculum (week × day grid) ── */}
      {lessons.length === 0 ? (
        <EmptyCurriculum isAdmin={isAdmin} />
      ) : (
        <section className="space-y-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Curriculum
          </h2>

          <div className="space-y-8">
            {weekGroups.map((group) => (
              <WeekBlock
                key={group.weekNumber}
                group={group}
                isSubscribed={isSubscribed}
                isAuthenticated={isAuthenticated}
                previewMode={previewMode}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function withReturnParam(path: string, returnTo: string): string {
  return `${path}?return=${encodeURIComponent(returnTo)}`
}

// ── Subject banner ───────────────────────────────────────────────────────────
// 16:9 hero image at the top of the page. Uses the shared SubjectThumbnail
// component (same one SubjectCard uses) so banner + card look consistent.

function SubjectBanner({ subject }: { subject: Subject }) {
  return (
    <SubjectThumbnail
      src={subject.thumbnailUrl}
      alt={subject.title}
      gradient={subject.thumbnail}
      className="aspect-video w-full rounded-2xl border"
    />
  )
}

// ── Empty curriculum ─────────────────────────────────────────────────────────

function EmptyCurriculum({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-10 flex flex-col items-center text-center gap-3">
      <div className="rounded-full bg-muted p-4">
        <CalendarClock className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="font-semibold text-lg">Curriculum coming soon</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Lesson content is being prepared for this subject.
        </p>
      </div>
      {isAdmin && (
        <Link
          to="/admin/lessons"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline mt-1"
        >
          <PlusCircle className="size-4" />
          Add lessons in Admin
        </Link>
      )}
    </div>
  )
}
