# Admin features

The Admin Panel is a separate, role-protected application for managing S-Class
content, users, sales, subscriptions, and landing-page content.

## Learning content

- **Courses:** manage parent course groups, names, slugs, descriptions, order,
  and publication status.
- **Subjects:** manage student-facing subjects, thumbnails, ordering,
  publication, and subject preview.
- **Lessons:** create, edit, search, order, and remove lessons. Lesson fields
  include title, subject, Week, Day, duration, video, solution content, and
  Free Preview status.
- **Week/Day management:** the Lesson form's curriculum slot controls the Week
  and Day position. The lesson order is assigned by the curriculum rules.
- **Problem Sets:** manage sets, questions, answer choices, explanations, and
  assignment to lessons.
- **Categories:** manage problem-set categories.

## Commerce and members

- **Books:** manage book details, prices, covers, stock, and publication.
- **Orders:** review book orders, payment/order status, and fulfillment details.
- **Users:** search users, view profile and subscription status, edit user
  details, manage roles where permitted, and open user actions.
- **Add/Edit User:** create or update account/profile information through the
  user form.
- **Reset User Password:** start an admin-triggered password reset for a user.
- **Device Reset:** remove registered devices so the user can sign in on a new
  device.
- **Manual Subscription Assignment:** assign Standard access and duration to a
  user, including a reason. This is an admin access action, not a PayMongo
  payment.
- **Subscriptions:** review subscription records and renew, extend, activate,
  deactivate, or set expiry according to the current record state.

## Landing content

- **Announcements:** create, edit, enable/disable, order, and remove homepage
  announcements.
- **Welcome Videos:** manage the welcome video, thumbnail, title, description,
  optional CTA, and enabled state.
- **Hero Banner:** manage homepage hero text and button labels.
- **Testimonials:** manage testimonial content and display state.
- **FAQ:** manage FAQ content and FAQ categories.
- **Contact content:** manage contact-page content and the Contact CTA.
- **Who We Are content:** manage the Who We Are page sections.
- **Review Packages:** manage package heading, packages, options, prices,
  durations, badges, features, ordering, and active state.

## Pending, not released

The current branch contains a Lesson `Preview Image` upload field intended for
the Curriculum Day hover preview. It is not current production behavior. Do not
instruct Admin staff to use it until the database migration has been confirmed
applied and the feature has been released. See [Change log](../change-log.md).
