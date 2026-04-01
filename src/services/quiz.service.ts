import { supabase } from './supabaseClient'
import { ApiError } from './ApiError'
import type { Quiz, QuizQuestion } from '@/features/quiz/types'

interface QuizRow {
  id: string
  lesson_id: string
}

interface QuizQuestionRow {
  id: string
  question_text: string
  question_image_url: string | null
  options: { text: string; image_url: string | null }[]
  correct_answer: number
  order: number
}

function toQuizQuestion(row: QuizQuestionRow): QuizQuestion {
  return {
    id:               row.id,
    question:         row.question_text ?? '',
    questionImageUrl: row.question_image_url ?? null,
    choices:          (row.options ?? []).map((o) => ({
      text:     o.text ?? '',
      imageUrl: o.image_url ?? null,
    })),
    correctAnswer: row.correct_answer,
  }
}

export async function getQuizByLessonId(lessonId: string): Promise<Quiz | undefined> {
  const { data: quizData, error: quizError } = await supabase
    .from('quizzes')
    .select('id, lesson_id')
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (quizError) throw new ApiError(500, 'QUIZ_FETCH_FAILED', quizError.message)
  if (!quizData) return undefined

  const quiz = quizData as QuizRow

  const { data: questionsData, error: questionsError } = await supabase
    .from('quiz_questions')
    .select('id, question_text, question_image_url, options, correct_answer, order')
    .eq('quiz_id', quiz.id)
    .order('order', { ascending: true })

  if (questionsError) throw new ApiError(500, 'QUIZ_FETCH_FAILED', questionsError.message)

  return {
    lessonId,
    questions: (questionsData as unknown as QuizQuestionRow[]).map(toQuizQuestion),
  }
}
