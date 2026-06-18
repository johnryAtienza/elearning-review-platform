export interface QuizChoice {
  text: string
  imageUrl?: string | null
}

export interface QuizQuestion {
  id: string
  /** Plain-text question stem. May be empty when questionImageUrl is set. */
  question: string
  questionImageUrl?: string | null
  choices: QuizChoice[]
  correctAnswer: number
  /** Optional answer explanation, shown to students after submission. */
  answerText?: string | null
  /** Optional explanation image (public URL), shown after submission. */
  answerImageUrl?: string | null
}

export type ProblemSetStatus = 'draft' | 'published'

export interface Quiz {
  id?: string
  lessonId: string
  title?: string
  description?: string | null
  randomize?: boolean
  categoryId?: string
  categoryName?: string
  categorySortOrder?: number
  sortOrder?: number
  status?: ProblemSetStatus
  questions: QuizQuestion[]
}

export interface ProblemSetCategory {
  id: string
  name: string
  sortOrder: number
  problemSetCount?: number
}

export interface ProblemSet extends Quiz {
  id: string
  title: string
  categoryId: string
  categoryName: string
  categorySortOrder: number
  sortOrder: number
  status: ProblemSetStatus
  questionCount: number
}

export interface QuizResult {
  score: number
  total: number
  correct: Set<string>
  wrong: Set<string>
}

export interface QuizGradeSnapshot {
  templateId: string | null
  templateTitle: string | null
  templateMaxScore: number | null
  classLabel: string
  description: string | null
  minScore: number | null
  maxScore: number | null
  scorePercentage: number | null
  snapshot: Record<string, unknown> | null
}
