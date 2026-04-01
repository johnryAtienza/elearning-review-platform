/**
 * Typed toast helpers wrapping Sonner.
 *
 * Usage:
 *   toast.success('Course created!')
 *   toast.error(err, 'Failed to delete course.')
 */

import { toast as _toast } from 'sonner'

export const toast = {
  success: (message: string) => _toast.success(message),

  /** Shows `err.message` if err is an Error, otherwise falls back to `fallback`. */
  error: (err: unknown, fallback: string) =>
    _toast.error(err instanceof Error ? err.message : fallback),

  info: (message: string) => _toast.info(message),
}
