/**
 * Shared admin table primitives.
 *
 * Usage pattern:
 *   1. Define GRID_COLS and HEADER_COLS once per page (single source of truth).
 *   2. Pass GRID_COLS to AdminTableHeader AND to each data-row div so header
 *      and rows always share the same column template → perfect alignment.
 *   3. Use EmptyState, DeleteConfirmRow, and filterTabClass instead of
 *      copy-pasting the same markup across every admin page.
 */

import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/button'

// ── Column configuration ───────────────────────────────────────────────────────

export interface ColConfig {
  /** Header label. Pass an empty string for spacer columns (e.g. actions). */
  label: string
  /** Center-align the header label. */
  center?: boolean
  /** Hide on mobile, show on sm+ (hidden sm:block). */
  smOnly?: boolean
}

// ── Shared row base class ──────────────────────────────────────────────────────
// Combine with your page-level GRID_COLS constant:
//   <div className={`${ADMIN_ROW_BASE} ${GRID_COLS}`}>

export const ADMIN_ROW_BASE =
  'grid items-center gap-4 px-4 py-3.5 hover:bg-muted/20 transition-colors'

// ── AdminTableHeader ──────────────────────────────────────────────────────────

interface AdminTableHeaderProps {
  cols: ColConfig[]
  /** Tailwind grid-cols-[…] class — must match the data-row grid template. */
  gridCols: string
}

export function AdminTableHeader({ cols, gridCols }: AdminTableHeaderProps) {
  return (
    <div
      className={cn(
        'grid items-center gap-4 border-b bg-muted/40 px-4 py-3',
        'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
        gridCols,
      )}
    >
      {cols.map((col, i) => (
        <span
          key={i}
          className={cn(
            col.center  && 'text-center',
            col.smOnly  && 'hidden sm:block',
          )}
        >
          {col.label}
        </span>
      ))}
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: React.ElementType
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted/60">
        <Icon className="size-7 text-muted-foreground/60" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      {action}
    </div>
  )
}

// ── DeleteConfirmRow ──────────────────────────────────────────────────────────

interface DeleteConfirmRowProps {
  /** The confirmation message — can include <strong> or other inline elements. */
  message: React.ReactNode
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmRow({ message, onConfirm, onCancel }: DeleteConfirmRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-destructive/20 bg-destructive/5 px-4 py-3">
      <p className="text-sm text-destructive">{message}</p>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline"     size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="destructive" size="sm" onClick={onConfirm}>Delete</Button>
      </div>
    </div>
  )
}

// ── filterTabClass ────────────────────────────────────────────────────────────

export function filterTabClass(active: boolean): string {
  return cn(
    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
    active
      ? 'bg-primary text-primary-foreground'
      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
  )
}
