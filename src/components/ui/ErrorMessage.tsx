import { AlertCircle } from 'lucide-react'
import { Button } from './button'

interface ErrorMessageProps {
  message?: string
  onRetry?: () => void
}

export function ErrorMessage({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-6 text-destructive" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-sm">Something went wrong</p>
        <p className="text-xs text-muted-foreground max-w-xs">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
