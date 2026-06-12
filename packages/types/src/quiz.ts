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

export interface Quiz {
  lessonId: string
  description?: string | null
  randomize?: boolean
  questions: QuizQuestion[]
}

export interface QuizResult {
  score: number
  total: number
  correct: Set<string>
  wrong: Set<string>
}
