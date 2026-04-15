import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'

export function PaymentCancelPage() {
  return (
    <section className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
          <X className="size-8 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Payment cancelled</h1>
          <p className="text-sm text-muted-foreground">
            No charge was made. You can try again whenever you&apos;re ready.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link to={ROUTES.SUBSCRIPTION}>View plans</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to={ROUTES.HOME}>Go home</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
