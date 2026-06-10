import type { ElementType } from 'react'
import { LayoutDashboard, BookOpen, CreditCard, User } from 'lucide-react'
import { ROUTES } from '@/constants/routes'

export interface NavItem {
  to:    string
  label: string
  icon:  ElementType
  end:   boolean
}

export interface NavSection {
  label: string | null
  items: readonly NavItem[]
}

/**
 * Single source of truth for the student portal's navigation structure.
 *
 * Consumed by `PortalLayout` (both its expanded and collapsed sidebar states),
 * which renders the same nav items whether the user is on a standard portal
 * page or a lesson page (lessons use PortalLayout with `defaultCollapsed`).
 *
 * Add, remove, or reorder items here only.
 */
export const PORTAL_NAV_SECTIONS: readonly NavSection[] = [
  {
    label: 'Learning',
    items: [
      { to: ROUTES.DASHBOARD,       label: 'Dashboard', icon: LayoutDashboard, end: true  },
      { to: ROUTES.PORTAL_SUBJECTS, label: 'Subjects',  icon: BookOpen,        end: false },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: ROUTES.SUBSCRIPTION, label: 'Subscription', icon: CreditCard, end: false },
      { to: ROUTES.PROFILE,      label: 'Profile',      icon: User,       end: false },
    ],
  },
]
