import { Navigate, useLocation, useParams } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'

export function RedirectPreservingLocation({ to }: { to: string }) {
  const location = useLocation()
  return <Navigate to={`${to}${location.search}${location.hash}`} replace />
}

export function LegacySubjectRedirect() {
  const { courseId } = useParams<{ courseId?: string }>()
  return <RedirectPreservingLocation to={courseId ? ROUTES.SUBJECT(courseId) : ROUTES.PORTAL_SUBJECTS} />
}

export function LegacyLessonRedirect() {
  const { lessonId } = useParams<{ lessonId?: string }>()
  return <RedirectPreservingLocation to={lessonId ? ROUTES.LESSON(lessonId) : ROUTES.PORTAL} />
}

export function LegacyBookCheckoutRedirect() {
  const { bookId } = useParams<{ bookId?: string }>()
  return <RedirectPreservingLocation to={bookId ? ROUTES.BOOK_CHECKOUT(bookId) : ROUTES.BOOKS} />
}
