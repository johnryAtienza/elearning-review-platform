# S-Class Admin User Manual

This guide is for S-Class staff who operate the Admin Panel. It explains what
to open, what to enter, and what happens after you save a change.

## Sign in and navigation

1. Open the Admin Panel.
2. Enter your admin email address and password.
3. Select **Sign in**.
4. Use the sidebar to open the area you need:
   - **Dashboard**
   - **Learning Content**: Courses, Subjects, Lessons, Problem Sets, Books
   - **Members**: Users
   - **Landing Page**: Hero Banner, Reviewer Packages, Testimonials, Welcome
     Videos, Contact Page, Contact CTA
   - **Page**: Who We Are Page, FAQ Page
   - **Announcements**
   - **Revenue**: Orders, Subscriptions
5. Select **Sign out** when you are finished.

Only authorized admin accounts can use the Admin Panel.

## Dashboard

The Dashboard provides an overview of users, subjects, lessons, active
subscriptions, lesson finishers, and completed lessons.

Use the Quick Actions to open **Manage Subjects**, **Manage Lessons**,
**Manage Users**, **Subscriptions**, or **Problem Sets**. The Dashboard is for
overview and navigation; make changes from the relevant page.

## Courses

1. Open **Courses**.
2. Select **New course**, or open an existing course to edit it.
3. Enter or update the course name, slug, description, and status.
4. Save the form.

Courses are parent learning groups. Use **Subjects** for the student-facing
curriculum.

## Subjects

1. Open **Subjects**.
2. Select **New Subject**, or open the edit action for an existing subject.
3. Enter or update the subject details, ordering, thumbnail where available,
   and publication status.
4. Save the form.
5. Use the view or preview action to check the subject page.

Publishing controls whether students can find the subject in the normal
catalogue.

## Lessons and Week/Day management

1. Open **Lessons**.
2. Select **New Lesson**, or edit an existing lesson.
3. Choose the **Subject**.
4. Enter the lesson **Title**.
5. Set the curriculum **Week** and **Day**.
6. Set the **Duration** if it should be shown to students.
7. Turn on **Free preview** only when the lesson should be available under the
   Free Preview rules.
8. Select a **Solution book** when the lesson's solution PDF is tied to a book
   purchase.
9. Upload the **Lesson Video** when one is available.
10. Upload the **Day Solution PDF** when one is available.
11. In **Preview Image**, select an optional JPG, PNG, or WebP image to show
    at the top of the student's enlarged Day-card preview.
12. Save the lesson with **Create lesson** or **Save changes**.

The Week and Day determine where the lesson appears in the curriculum. Lesson
order is assigned by the curriculum rules; do not try to create an arbitrary
order outside those fields.

The lesson form currently supports MP4, WebM, or MOV lesson videos and PDF day
solutions. Follow the size and format limits shown beside each upload field.

### Preview Image

The **Preview Image** is the image shown at the top of the enlarged lesson
preview when a student points to an available Day card on a desktop or laptop.

- When editing a lesson that already has an image, the current image is shown
  in the form.
- Select the current image to use **Change image**, then choose a JPG, PNG, or
  WebP file up to 5 MB.
- Review the new image, then select **Save changes**. The form shows upload
  progress while the image is being saved.
- When creating a lesson, select **Click to select Preview Image**, choose the
  image, and select **Create lesson**.
- The current form does not provide a separate control to clear an already
  saved Preview Image. The X control removes a newly selected replacement
  before saving; it does not remove the existing saved image.

If a lesson has no Preview Image, students see the standard S-Class logo in the
enlarged preview.

### Free Preview

Turn on **Free preview** only when students or guests should be able to access
that lesson under the Free Preview rules. Free Preview does not unlock other
lessons or premium content.

## Problem Sets, Categories, and Scoring / Grades

### Create or edit a Problem Set

1. Open **Problem Sets**.
2. Open the **Problem Sets** tab.
3. Select **New Problem Set**, or edit an existing set.
4. Enter the set details and assign it to the required lesson.
5. Add the questions, answer choices, explanations, and any category.
6. Save the set.

Review the lesson assignment and questions carefully before students use the
set. Changes can affect student results.

### Manage Categories

1. Open **Problem Sets**.
2. Open the **Categories** tab.
3. Select **New Category**, or edit an existing category.
4. Enter the category information.
5. Save the category.

### Manage Scoring / Grades

1. Open **Problem Sets**.
2. Open the **Scoring / Grades** tab.
3. Select **New Scoring Template**, or edit an existing template.
4. Enter the scoring or grade settings.
5. Save the template.

## Books

1. Open **Books**.
2. Select **New Book**, or edit an existing book.
3. Enter or update the title, description, price, cover, stock, and other
   requested book details.
4. Save the book.
5. Use the publish or unpublish control to decide whether the book is offered
   for new orders.

Changing stock or publication status affects what students can purchase.

**Important:** Books with existing orders cannot be deleted. If a book should
no longer be offered, use the publish/unpublish controls instead.

## Orders

1. Open **Orders**.
2. Search for the order or filter by its status.
3. Open the order details.
4. Review the customer, item, payment, shipping, and order information.
5. Use the available action for the current order state:
   - **Mark as paid** after payment has been confirmed.
   - Enter the tracking number when the order is ready for shipment.
   - **Mark as shipped** after the package has been sent.
   - **Mark as delivered** after delivery is confirmed.
   - **Cancel order** when the order should not continue.

Update the order status only after the corresponding payment, packing, or
shipping step has actually happened.

## Users

### Add a user

1. Open **Users**.
2. Select **Add User**.
3. Enter the user's **Email**, **Temporary password**, **First name**,
   **Last name**, **Mobile number**, **School**, and **School ID**.
4. Select the correct **Role**.
5. Select **Create user**.

Give the temporary password to the user securely. The user can update their
password after signing in.

### Edit a user

1. Open **Users**.
2. Find the user.
3. Select the edit action.
4. Update the user's **First name**, **Last name**, **Mobile number**,
   **School**, or **School ID**.
5. Select **Save changes**.

Review the account carefully before saving. User email and password changes use
their separate actions.

### Reset a user's password

1. Open **Users**.
2. Find the user.
3. Open the user actions.
4. Select **Reset password**.
5. Enter the new password and enter it again to confirm.
6. Make sure the password contains at least 8 characters, 1 uppercase letter,
   and 1 number.
7. Select **Reset password**.

The new password takes effect immediately. Share it with the user through a
secure channel. Do not store or share it publicly.

### Reset a user's devices

1. Open **Users**.
2. Find the user.
3. Open the device actions.
4. Choose one of the available options:
   - **Reset Desktop Device** signs out the user's registered laptop or desktop.
   - **Reset Mobile Device** signs out the user's registered mobile device.
   - **Reset All Devices** signs out all registered devices.
5. Confirm the action.

Use device reset when a user needs to free a device slot or an old device is no
longer trusted.

## Manual Subscription Assignment

1. Open **Users**.
2. Find the student.
3. Select **Manage subscription**.
4. Review the current access and expiry date.
5. Select a duration of **1 month**, **3 months**, or **6 months**.
6. Optionally complete **Internal reason (optional)**.
7. Select **Assign Standard**.

This grants or extends Standard access after the assignment succeeds. If the
student already has an active subscription, the additional time extends the
existing expiry where applicable. Otherwise, access begins according to the
assignment shown in the confirmation.

Manual assignment does not process an online payment or create an online
payment transaction. Use it only for an approved administrative access decision.

## Subscription management

1. Open **Subscriptions**.
2. Search for the subscription or filter by status.
3. Open the available action for the current state.
4. Choose the appropriate action: **Renew**, **Extend**, **Activate**,
   **Deactivate**, or **Set Expiry**.
5. Enter the requested date or reason.
6. Confirm the change and check the success message.

Use **Renew** for an expired subscription, **Extend** for an active
subscription, and **Set Expiry** when a specific expiry date is needed. Do not
restore an expired subscription as if it were still active unless that is the
approved decision.

## Announcements

1. Open **Announcements**.
2. Select **New Announcement**, or edit an existing announcement.
3. Enter the announcement text, icon, publish date, order, and enabled state.
4. Save the announcement.
5. Use **Enable** or **Disable** to control whether it appears on the site.

Use the edit and delete actions carefully because changing or deleting an
announcement affects what students see.

## Welcome Videos

1. Open **Welcome Videos**.
2. Enter or update the thumbnail, title, description, and video URL.
3. If the video should include a call-to-action, enter both the CTA label and
   CTA link.
4. Turn the enabled option on or off.
5. Select **Save**.

Review the video and link before enabling it.

## Hero Banner

1. Open **Hero Banner**.
2. Edit the **Eyebrow**, **Title**, **Description**, **Primary button label**,
   and **Secondary button label**.
3. Select **Save**.
4. Review the homepage to confirm the result.

## Testimonials

1. Open **Testimonials**.
2. Update the testimonials heading if needed.
3. Select **Add Reviewer**, or open **Update Reviewer** for an existing entry.
4. Enter or update the reviewer information and testimonial text.
5. Save the entry.
6. Reorder entries and use the enable or disable control as needed.
7. Delete an entry only when it should no longer appear.

## Reviewer Packages

1. Open **Reviewer Packages**.
2. Update the package heading if needed.
3. Select the action to add or edit a package.
4. Enter the package title, price, access months, description, badge, options,
   and features.
5. Save the package.
6. Reorder packages and use enable or disable when needed.

Review the pricing presentation before enabling a package.

## Contact Page and Contact CTA

### Contact Page

1. Open **Contact Page**.
2. Update the eyebrow, page title, page description, and displayed opening
   hours or Sunday status.
3. Use the contact-card actions to add or edit a contact channel.
4. For each card, enter its label, value, helper text, and link or action URL.
5. Use show or hide to control whether a card appears.
6. Select **Save** where shown.

### Contact CTA

1. Open **Contact CTA**.
2. Update the title, description, and CTA button label.
3. Save the content.

## Who We Are Page

1. Open **Who We Are Page**.
2. Update the page eyebrow and page title when needed.
3. Select **Add Section**, or edit an existing section.
4. Enter the section title and body text.
5. Save the section.
6. Reorder, enable, disable, or delete sections as needed.

Review the public page after changing the order or visibility of sections.

## FAQ Page

1. Open **FAQ Page**.
2. Update the FAQ page content when needed.
3. Use the category actions to add or edit an FAQ category.
4. Use the FAQ item actions to add or edit a question and answer.
5. Set the category or item order where available.
6. Save the changes.

Review the public FAQ after a large content update.
