/**
 * The "Review Classes Offered" packages shown on the Home page.
 *
 * Captured directly from the client's wireframe (page 1). Pricing strings
 * stay as `Php x,xxx` placeholders until the client confirms the numbers.
 *
 * Each package has:
 *  - `inclusions`  — what comes with the package (books + online access)
 *  - `accessFor`   — duration of online access (always 6 months in v1)
 *  - `priceLabel`  — display string (e.g. "Php x,xxx") or null if package
 *                    is described inline only (e.g. the Full Review)
 *  - `options`     — for packages with selectable variants (e.g. with-book
 *                    vs. online-only). Optional.
 */

export interface OfferingOption {
  label: string
  inclusions: string[]
  priceLabel: string
}

export interface Offering {
  id: string
  title: string
  /** Short tagline shown under the title. */
  description?: string
  /** Inclusions for the headline package (when there are no options). */
  inclusions?: string[]
  /** Duration of online access, e.g. "6 months". */
  accessFor: string
  /** Display string for the headline price. Null = "see options below". */
  priceLabel: string | null
  /** Sub-options for packages with variants (e.g. with-book vs online-only). */
  options?: OfferingOption[]
  /** Optional badge text rendered next to the title (e.g. "Most Complete"). */
  badge?: string
}

export const OFFERINGS: Offering[] = [
  {
    id: 'full-mechanical',
    title: 'Full Mechanical Engineering Review',
    description:
      'The complete board-prep package. All three reviewer books plus six ' +
      'months of online access and weekly topnotcher catch-up sessions.',
    badge: 'Most Complete',
    accessFor: '6 months',
    priceLabel: 'Php x,xxx',
    inclusions: [
      'Engineering Mathematics book (hard copy)',
      'Machine Design book (hard copy)',
      'Power and Industrial Plant Engineering book (hard copy)',
      'Video book explainer for all subjects',
      'Daily Multiple Choice Practice Problems (Engineering Math) — with complete solutions',
      'Weekly Multiple Choice Practice Problems (Engineering Math) — with complete solutions',
      'Daily Multiple Choice Elements (Engineering Math) — with complete solutions',
      'Daily Multiple Choice Elements — terminologies and concepts',
      'Weekly online catch-up sessions with a board topnotcher (1st Place!!)',
    ],
  },
  {
    id: 'eng-math-special',
    title: 'Engineering Mathematics Special Review',
    description:
      'For any engineering course. Choose the package that fits how you ' +
      'study — printed reviewer included, or online-only.',
    accessFor: '6 months',
    priceLabel: null,
    options: [
      {
        label: 'Option 1 — with reviewer book',
        priceLabel: 'Php x,xxx',
        inclusions: [
          'Engineering Mathematics book (hard copy)',
          'Video book explainer (Engineering Math)',
          'Daily MC Practice Problems (Engineering Math) — with complete solutions',
          'Daily MC Elements (Engineering Math) — with complete solutions',
          'Daily MC Elements — terminologies and concepts',
        ],
      },
      {
        label: 'Option 2 — online only',
        priceLabel: 'Php x,xxx',
        inclusions: [
          'Video book explainer (Engineering Math)',
          'Daily MC Practice Problems (Engineering Math) — with complete solutions',
          'Daily MC Elements — terminologies and concepts',
        ],
      },
    ],
  },
]

export const CONTACT_BLURB =
  'Contact us for inquiries and payment instructions. ' +
  'We confirm enrolment within one business day and ship books nationwide.'
