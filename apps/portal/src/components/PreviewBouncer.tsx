import { useEffect, useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { getLessonsBySubjectId, getLessonPreviewById } from '@s-class/api/lesson.service'
import { isFreePreview } from '@s-class/api/accessControl'
import { useAuthStore } from '@s-class/auth/authStore'
import { ROUTES } from '@s-class/constants/routes'
import { getAbsoluteUrl } from '@s-class/constants/urls'
import { PageLoader } from '@s-class/ui/PageLoader'

type PreviewBouncerProps = {
  kind: 'lesson' | 'subject'
}

/**
 * Preserves old guest bookmarks for free previews during the route migration.
 * Authenticated users always continue into the protected Portal route. Guests
 * are sent to Landing only when the public lesson_previews data confirms that
 * the target has a free-preview surface.
 */
export function PreviewBouncer({ kind }: PreviewBouncerProps) {
  const { lessonId, courseId } = useParams<{ lessonId?: string; courseId?: string }>()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitializing = useAuthStore((s) => s.isInitializing)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (isInitializing || isAuthenticated) {
      setChecking(false)
      return
    }

    let cancelled = false

    async function checkPreview() {
      setChecking(true)
      let redirected = false
      try {
        if (kind === 'lesson' && lessonId) {
          const lesson = await getLessonPreviewById(lessonId)
          if (!cancelled && isFreePreview(lesson)) {
            redirected = true
            window.location.replace(getAbsoluteUrl(ROUTES.PREVIEW_LESSON(lessonId)))
            return
          }
        }

        if (kind === 'subject' && courseId) {
          const lessons = await getLessonsBySubjectId(courseId)
          if (!cancelled && lessons.some((lesson) => isFreePreview(lesson))) {
            redirected = true
            window.location.replace(getAbsoluteUrl(ROUTES.PREVIEW_SUBJECT(courseId)))
            return
          }
        }
      } catch (err) {
        console.error('Failed to check preview route:', err)
      } finally {
        if (!cancelled && !redirected) setChecking(false)
      }
    }

    void checkPreview()

    return () => {
      cancelled = true
    }
  }, [courseId, isAuthenticated, isInitializing, kind, lessonId])

  if (isInitializing || checking) return <PageLoader />

  return <Outlet />
}
