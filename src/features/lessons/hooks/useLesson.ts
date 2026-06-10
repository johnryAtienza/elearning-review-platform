import { useState, useEffect } from 'react'
import { lessonApi } from '@/services/lessonApi'
import { subjectApi } from '@/services/subjectApi'
import type { Lesson } from '../types'
import type { Subject } from '@/features/subjects/types'

export interface LessonData {
  lesson: Lesson
  subject: Subject | undefined
  siblings: Lesson[]
  currentIdx: number
  prev: Lesson | undefined
  next: Lesson | undefined
  progress: number
}

export interface UseLessonResult {
  data: LessonData | null
  loading: boolean
  notFound: boolean
  error: string | null
}

export function useLesson(lessonId: string): UseLessonResult {
  const [data, setData] = useState<LessonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    setError(null)
    setData(null)

    async function load() {
      try {
        const lesson = await lessonApi.getById(lessonId)

        if (!lesson) {
          if (!cancelled) { setNotFound(true); setLoading(false) }
          return
        }

        // Lesson.courseId field name is preserved (bridge field); value is the
        // parent subject's id. See plan §6.7 follow-up notes.
        const [subject, siblings] = await Promise.all([
          subjectApi.getById(lesson.courseId),
          lessonApi.getBySubject(lesson.courseId),
        ])

        if (cancelled) return

        const currentIdx = siblings.findIndex((l) => l.id === lesson.id)
        const progress   = Math.round(((currentIdx + 1) / siblings.length) * 100)

        setData({
          lesson,
          subject,
          siblings,
          currentIdx,
          prev: siblings[currentIdx - 1],
          next: siblings[currentIdx + 1],
          progress,
        })
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load lesson.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [lessonId])

  return { data, loading, notFound, error }
}
