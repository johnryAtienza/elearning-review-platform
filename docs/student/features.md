# Student features

This document describes the released student experience. The Curriculum Day
hover preview and Lesson Preview Image work is pending and is intentionally not
described as a released feature.

## Public and account features

- Marketing pages: Home, About, Contact, FAQ, pricing, and books.
- Public subject and lesson previews where content is marked as free preview.
- Registration with email/password and email confirmation.
- Login, logout, forgot password, and password reset.
- Profile details and password management.
- Device management and device-slot removal.

## Learning experience

- Browse and search published subjects.
- Open a subject curriculum grouped by Week and Day.
- Open lessons that the current account can access.
- Watch lesson videos.
- Read reviewer/PDF material where available.
- Open problem sets/quizzes, submit attempts, and review history/results.
- Track watched/completed lessons and dashboard progress.
- Move between available previous and next lessons.

## Books

Students can browse books, complete checkout, and view order/payment status.
Some lesson solution PDFs are gated by ownership of the associated book. A
subscription may also grant access where the access rules allow it.

## Released access behavior

- Free users can access content explicitly marked Free Preview.
- Standard access is provided by an active, non-expired Standard subscription.
- Sequential lesson rules can keep later lessons locked until earlier lessons
  are watched or completed.
- Locked lessons cannot be opened by changing the browser URL.

See [Access control](../access-control.md) for the developer-level entitlement
model and the [Student User Guide](../manuals/s-class-student-user-guide.md) for
step-by-step instructions.

## Pending, not released

The current branch contains a desktop-only Curriculum Day hover preview with a
`View Lesson` CTA and Admin-managed Lesson Preview Image support. It is not
released production functionality until the database migration is confirmed
applied and the feature is deployed. See
[Change log](../change-log.md) and [Known gaps](../known-gaps.md).
