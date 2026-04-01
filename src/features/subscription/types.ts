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
