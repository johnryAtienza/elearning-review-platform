import { supabase } from './supabaseClient'
import { ApiError } from './ApiError'
import { normalizePublicAssetDisplayUrl } from './publicAssetUrl'
import type { ProblemSet, ProblemSetStatus, Quiz, QuizQuestion } from '@s-class/types/quiz'

interface QuizRow {
  id: string
  lesson_id: string
  title: string | null
  description: string | null
  randomize_questions: boolean
  category_id: string
  category: { id: string; name: string; sort_order: number | null } | null
  sort_order: number | null
  status: ProblemSetStatus | null
}

interface QuizQuestionRow {
  id: string
  question_text: string
  question_image_url: string | null
  options: { text: string; image_url: string | null }[]
  correct_answer: number
  order: number
  answer_text: string | null
  answer_image_url: string | null
}

function normalizeQuizMediaUrl(value?: string | null): string | null {
  if (!value?.trim()) return null
  return normalizePublicAssetDisplayUrl(value) ?? value.trim()
}

function toQuizQuestion(row: QuizQuestionRow): QuizQuestion {
  return {
    id:               row.id,
    question:         row.question_text ?? '',
    questionImageUrl: normalizeQuizMediaUrl(row.question_image_url),
    choices:          (row.options ?? []).map((o) => ({
      text:     o.text ?? '',
      imageUrl: normalizeQuizMediaUrl(o.image_url),
    })),
    correctAnswer:    row.correct_answer,
    answerText:       row.answer_text ?? null,
    answerImageUrl:   normalizeQuizMediaUrl(row.answer_image_url),
  }
}

async function getQuestionsForQuiz(quizId: string): Promise<QuizQuestion[]> {
  const { data: questionsData, error: questionsError } = await supabase
    .from('quiz_questions')
    .select('id, question_text, question_image_url, options, correct_answer, order, answer_text, answer_image_url')
    .eq('quiz_id', quizId)
    .order('order', { ascending: true })

  if (questionsError) throw new ApiError(500, 'QUIZ_FETCH_FAILED', questionsError.message)

  return (questionsData as unknown as QuizQuestionRow[]).map(toQuizQuestion)
}

export async function getProblemSetsByLessonId(lessonId: string): Promise<ProblemSet[]> {
  const { data: quizData, error: quizError } = await supabase
    .from('quizzes')
    .select('id, lesson_id, title, description, randomize_questions, category_id, category:problem_set_categories(id, name, sort_order), sort_order, status')
    .eq('lesson_id', lessonId)
    .eq('status', 'published')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (quizError) throw new ApiError(500, 'QUIZ_FETCH_FAILED', quizError.message)
  if (!quizData) return []

  const quizzes = quizData as unknown as QuizRow[]
  const questionLists = await Promise.all(quizzes.map((quiz) => getQuestionsForQuiz(quiz.id)))

  return quizzes.map((quiz, index) => {
    const questions = questionLists[index] ?? []
    return {
      id:                quiz.id,
      lessonId,
      title:             quiz.title?.trim() || 'Elements',
      description:       quiz.description ?? null,
      randomize:         quiz.randomize_questions ?? false,
      categoryId:        quiz.category?.id ?? quiz.category_id,
      categoryName:      quiz.category?.name?.trim() || 'Elements',
      categorySortOrder: quiz.category?.sort_order ?? 40,
      sortOrder:         quiz.sort_order ?? 0,
      status:            quiz.status ?? 'published',
      questionCount:     questions.length,
      questions,
    }
  }).sort((a, b) =>
    a.categorySortOrder - b.categorySortOrder
    || a.categoryName.localeCompare(b.categoryName)
    || a.sortOrder - b.sortOrder
    || a.title.localeCompare(b.title)
  )
}

export async function getQuizByLessonId(lessonId: string): Promise<Quiz | undefined> {
  return (await getProblemSetsByLessonId(lessonId))[0]
}
