/**
 * Hardcoded FAQ content for the public /faq page.
 *
 * Items are grouped by topic. Within a group, order is preserved. Replace
 * placeholder copy with real answers from the client before launch.
 */

export interface FaqItem {
  question: string
  /** Plain text. Newlines render as paragraph breaks. */
  answer: string
}

export interface FaqGroup {
  /** Section heading, e.g. "Enrollment". */
  heading: string
  items: FaqItem[]
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    heading: 'Enrollment',
    items: [
      {
        question: 'How do I enrol in a CLASS S review?',
        answer:
          'Pick a package on the Home page, click Enroll Now, and complete payment via GCash, Maya, or card. ' +
          "Your online access is activated immediately; printed books ship within 5 business days.",
      },
      {
        question: 'How long is the online access valid?',
        answer:
          'Every standard package includes 6 months of online access from the date of activation. ' +
          'Renewing before your access expires stacks the new months on top — no days lost.',
      },
      {
        question: 'Can I switch packages after enrolling?',
        answer:
          'Yes — message us via the Contact Us page and we will arrange the upgrade. Any unused time on your ' +
          'current package carries over.',
      },
    ],
  },
  {
    heading: 'Access & content',
    items: [
      {
        question: 'What is included on Day 1 of each course?',
        answer:
          'Day 1 of every course is fully open to all logged-in users — full-length video, full PDF, and the ' +
          'quiz — so you can sample the experience before subscribing.',
      },
      {
        question: 'Why am I blocked on Day 2 onwards?',
        answer:
          "Day 2 onwards is part of the Standard package. Click Enroll Now on any locked Day card to subscribe " +
          'and unlock the full curriculum.',
      },
      {
        question: 'Are quiz answers reviewed after I submit?',
        answer:
          'Yes — Standard plan members see the correct answer and explanation after submitting each quiz. ' +
          'Free users see their score only.',
      },
    ],
  },
  {
    heading: 'Books & shipping',
    items: [
      {
        question: 'Do you ship outside Metro Manila?',
        answer: 'Yes — we ship to all PH provinces within 5 business days of payment confirmation.',
      },
      {
        question: 'What if my book arrives damaged?',
        answer:
          'Email us photos of the damage within 7 days of delivery and we will arrange a replacement at no cost.',
      },
      {
        question: 'Can I buy a book without enrolling in the review?',
        answer: 'Yes — printed books can be purchased separately from the Books tab.',
      },
    ],
  },
  {
    heading: 'Payments',
    items: [
      {
        question: 'What payment methods do you accept?',
        answer:
          'GCash, Maya, and major credit/debit cards (Visa, Mastercard, JCB) — all processed securely through PayMongo.',
      },
      {
        question: 'Is there a refund policy?',
        answer:
          'Online access is non-refundable once activated. Unopened books may be returned within 7 days for a refund of the book price (shipping is non-refundable).',
      },
    ],
  },
  {
    heading: 'Account & devices',
    items: [
      {
        question: 'Can I log in on multiple devices?',
        answer:
          'Yes — one mobile device and one laptop/desktop per account. If you try to log in on a third device, ' +
          'you will be asked to sign out from one of your existing devices first.',
      },
      {
        question: 'I forgot my password — what do I do?',
        answer:
          'Click "Log in" → "Forgot password?". Enter your email and we will send a reset link.',
      },
    ],
  },
]
