import { useState, useEffect } from 'react'
import { getLessonById, getLessonsByCourse } from '../services/lessonService'
import { getCourseById } from '@/features/courses/services/courseService'
import type { Lesson } from '../types'
import type { Course } from '@/features/courses/types'

export interface LessonData {
  lesson: Lesson
  course: Course | undefined
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
        const lesson = await getLessonById(lessonId)

        if (!lesson) {
          if (!cancelled) { setNotFound(true); setLoading(false) }
          return
        }

        const [course, siblings] = await Promise.all([
          getCourseById(lesson.courseId),
          getLessonsByCourse(lesson.courseId),
        ])

        if (cancelled) return

        const currentIdx = siblings.findIndex((l) => l.id === lesson.id)
        const progress   = Math.round(((currentIdx + 1) / siblings.length) * 100)

        setData({
          lesson,
          course,
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
