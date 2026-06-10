/**
 * Hardcoded contact channels for the public Contact Us page.
 *
 * v1: no form submission — visitors reach out via mailto / tel / Messenger.
 * Replace the placeholder values with real ones before launch.
 */

export interface ContactChannel {
  /** Display label, e.g. "Email us". */
  label: string
  /** Plain-text value shown under the label, e.g. "hello@class-s.ph". */
  value: string
  /** Href the link points to (mailto:, tel:, https://m.me/, etc.). */
  href: string
  /** Optional helper text shown under the value. */
  helper?: string
}

export const CONTACT_CHANNELS: ContactChannel[] = [
  {
    label:  'Email us',
    value:  'hello@class-s.ph',
    href:   'mailto:hello@class-s.ph',
    helper: 'We reply within one business day.',
  },
  {
    label:  'Call us',
    value:  '+63 917 000 0000',
    href:   'tel:+639170000000',
    helper: 'Mon–Sat, 9:00 AM – 6:00 PM (PHT).',
  },
  {
    label:  'Facebook Messenger',
    value:  'm.me/classsreview',
    href:   'https://m.me/classsreview',
    helper: 'Fastest channel for quick questions.',
  },
]

export const BUSINESS_HOURS = [
  { day: 'Monday – Friday', hours: '9:00 AM – 6:00 PM' },
  { day: 'Saturday',         hours: '9:00 AM – 1:00 PM' },
  { day: 'Sunday',           hours: 'Closed' },
]

export const CONTACT_INTRO =
  "Questions about enrolment, books, or the platform? Reach out via any of the channels " +
  'below — we read every message and reply within one business day.'
