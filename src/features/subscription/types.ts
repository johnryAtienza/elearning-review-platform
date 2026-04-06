export type SubscriptionTier = 'free' | 'standard'

export interface TierPermissions {
  /** Max seconds of video playable. Number.MAX_SAFE_INTEGER = no limit. */
  videoPreviewSeconds: number
  /** Max PDF pages viewable. Number.MAX_SAFE_INTEGER = no limit. */
  pdfMaxPages: number
  /** Whether the quiz section is accessible */
  quizEnabled: boolean
  /** File download — disabled for all tiers per policy */
  downloadEnabled: boolean
  /** Show correct answers in result summary after quiz submission */
  showAnswersAfterQuiz: boolean
}

export interface SubscriptionPlan {
  id: string
  name: string
  price: string
  period: string
  description: string
  features: string[]
  missing: string[]
  cta: string
  highlight: boolean
}
