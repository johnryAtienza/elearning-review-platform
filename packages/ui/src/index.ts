// Barrel re-export. Prefer the subpath imports (e.g. '@s-class/ui/button')
// in app code — they're tree-shake-friendly. Barrel here for convenience.
export { cn } from './cn'
export { Button, buttonVariants } from './components/button'
export { Input } from './components/input'
export { Badge, badgeVariants } from './components/badge'
export { Skeleton } from './components/skeleton'
export { ErrorMessage, FormAlert } from './components/ErrorMessage'
export { PageLoader } from './components/PageLoader'
