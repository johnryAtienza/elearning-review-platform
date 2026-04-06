import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LogoutModalProps {
  onConfirm: () => void
  onCancel: () => void
}

export function LogoutModal({ onConfirm, onCancel }: LogoutModalProps) {
  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl border bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <LogOut className="size-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Log out?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You will be returned to the login screen.
            </p>
          </div>
          <div className="flex w-full gap-3">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={onConfirm}>
              Log out
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
