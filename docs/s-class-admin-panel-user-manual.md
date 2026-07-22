# S-Class Admin Panel User Manual

This manual is for S-Class admin staff who manage content, users, orders, homepage items, and subscriptions in the Admin Panel.

It focuses on what admins can see and do inside the Admin Panel. It avoids technical setup details. If a workflow is not visible in the Admin Panel, it is marked as **Needs confirmation**.

## Quick Overview

The Admin Panel is a restricted area for authorized admin accounts only.

After signing in, admins land on the **Dashboard**, which gives a platform overview and quick links to common admin areas.

Main admin areas:

- **Dashboard** - platform metrics and quick actions.
- **Courses** - parent learning groups, such as broad course categories.
- **Subjects** - student-facing subjects that contain lessons.
- **Lessons** - videos and curriculum slots inside subjects.
- **Problem Sets** - practice sets, categories, questions, and scoring templates.
- **Books** - book catalog items for sale.
- **Users** - registered accounts, roles, profile details, and device reset actions.
- **Announcements** - homepage announcements.
- **Welcome Videos** - homepage welcome video content.
- **Orders** - book order review and fulfillment.
- **Subscriptions** - paid access status and expiry management.

## Navigation Guide

1. Open the Admin Panel and sign in through **Admin sign in**.
2. Enter **Email address** and **Password**.
3. Select **Sign in**.
4. Use the left sidebar to move between admin sections.
5. On smaller screens, use the menu button to open the sidebar.
6. Use **Back to site** to return to the learner site.
7. Use **Sign out** when finished.

Sidebar groups:

- **Dashboard**
- **Learning Content**: Courses, Subjects, Lessons, Problem Sets, Books
- **Members**: Users, Announcements, Welcome Videos
- **Revenue**: Orders, Subscriptions

## Dashboard

### What The Page Is For

The **Dashboard** shows a quick overview of platform activity and gives shortcuts to high-use admin pages.

### What Admins Can See

Admins can see these cards:

- **Total Users** - all registered accounts, with a split between **Standard** and **Free**.
- **Total Subjects** - all subjects, with a split between published subjects and drafts.
- **Total Lessons** - all lessons across subjects.
- **Active Subscriptions** - users with currently active paid access.
- **Lesson Finishers** - unique students who completed at least one lesson.
- **Lessons Completed** - total lesson completion count across all users.

Admins can also see **Quick Actions**:

- **Manage Subjects**
- **Manage Lessons**
- **Manage Users**
- **Subscriptions**
- **Problem Sets**

### What Admins Can Do

- Review current platform activity.
- Open key admin pages from **Quick Actions**.

### Creating, Searching, Editing, Or Deleting Records

The Dashboard does not create, search, edit, or delete records directly. Use the related management pages instead.

### Statuses Shown

- **Standard** and **Free** for users.
- **Published** and **Drafts** for subjects.

## Courses

### What The Page Is For

The **Courses** page manages parent learning groups. A course can contain multiple subjects.

### What Admins Can See

Admins can see:

- **Name**
- **Slug**
- **Description**
- **Status**
- **Subjects** count

Admins can sort by **Name** or **Subjects**.

### What Admins Can Do

- Create a course.
- Search courses.
- Sort the course list.
- Edit a course.
- Delete a course.
- Set course status.

### How To Create A New Course

1. Go to **Courses**.
2. Select **New course**.
3. Fill out the course fields.
4. Choose a **Status**.
5. Select **Create course**.

### Important Fields

- **Name** - course name shown to admins and used to generate the slug.
- **Slug** - URL-safe identifier. It is auto-generated from the name but can be edited.
- **Description** - optional short description.
- **Status** - controls whether the course appears in public navigation.

### Required Fields

- **Name**
- **Slug**

### Statuses

- **Draft** - hidden from public navigation.
- **Published** - visible in public navigation.
- **Archived** - hidden, retained for records.

### View Or Search Records

Use **Search courses...** to search by name, slug, description, status, or subject count.

### Edit Or Update Records

1. Select the edit button on the course row.
2. Update the fields.
3. Select **Save changes**.

### Delete Or Archive Records

To delete:

1. Select the delete button on the course row.
2. Select **Confirm**.

To archive instead of deleting:

1. Edit the course.
2. Change **Status** to **Archived - hidden, retained for records**.
3. Select **Save changes**.

### Warnings

- The slug must use lowercase letters, numbers, and hyphens only.
- The name and slug must not duplicate another course.
- Deleting a course does not delete existing subjects. Those subjects become unassigned.

### What Happens After Saving

The course list updates. New courses appear in the table, and edited courses show the new details immediately.

## Subjects

### What The Page Is For

The **Subjects** page manages student-facing subjects. Subjects contain lessons and can be published or kept as drafts.

### What Admins Can See

Admins can see:

- **Thumb**
- **Order**
- **Subject** title and description
- **Lessons** count
- **Status**
- Available row actions

The page summary shows total subjects and how many are published.

### What Admins Can Do

- Create a subject.
- Search subjects.
- Publish or unpublish a subject.
- Edit a subject.
- Preview a draft or view a published subject on the site.
- Delete a subject.

### How To Create A New Subject

1. Go to **Subjects**.
2. Select **New Subject**.
3. Add a **Thumbnail** if available.
4. Enter the **Title**.
5. Set the **Order**.
6. Add a **Description**.
7. Choose a **Course**, or leave it as **No course**.
8. Select **Create subject**.
9. Publish the subject when it is ready for students.

### Important Fields

- **Thumbnail** - optional image. JPG, PNG, or WebP, maximum 5 MB.
- **Title** - subject name.
- **Order** - lower numbers appear first in subject menus and listings.
- **Description** - short explanation of what students will learn.
- **Course** - parent course grouping.

### Required Fields

- **Title**

The **Order** must be a whole number.

### Statuses

- **Draft** - admin-only and not visible to students in the public list.
- **Published** - visible to students.

### View Or Search Records

Use **Search subjects...** to search by title, course, description, order, lesson count, or status.

### Edit Or Update Records

1. Select the edit button on the subject row.
2. Update the subject details.
3. Select **Save changes**.

### Publish, Unpublish, Or Delete Records

To publish or unpublish:

1. Select the publish/unpublish button on the subject row.
2. The status changes between **Published** and **Draft**.

To view or preview:

1. Select **View on site** for published subjects.
2. Select **Preview draft** for draft subjects.

To delete:

1. Select the delete button on the subject row.
2. Review the confirmation.
3. Select **Delete**.

### Warnings

- Deleting a subject shows: "This cannot be undone."
- Unpublishing a subject moves it back to draft.
- Publish only after the subject details, lessons, and order are ready.

### What Happens After Saving

The subject list updates, and a success message appears. New subjects are created as drafts unless published from the row action.

## Lessons

### What The Page Is For

The **Lessons** page manages lesson records inside subjects, including curriculum placement, free previews, duration, and lesson video upload.

### What Admins Can See

Admins can see:

- **Lesson** title
- Subject badge
- **Week**
- **Day**
- **Free Preview**
- **Duration**
- **Video** upload indicator
- Available row actions

Admins can filter lessons by **All subjects** or by a specific subject.

### What Admins Can Do

- Create a lesson.
- Search lessons.
- Filter lessons by subject.
- Edit a lesson.
- Upload or replace a lesson video.
- Delete a lesson.

### How To Create A New Lesson

1. Go to **Lessons**.
2. Select **New Lesson**.
3. Select a **Subject**.
4. Enter the **Title**.
5. Set the **Curriculum slot** using **Week** and **Day**.
6. Turn **Free preview** on only if guests and free-tier users should watch the lesson in full.
7. Set **Duration** if needed.
8. Under **File Uploads**, select the **Lesson Video** if available.
9. Select **Create lesson**.

### Important Fields

- **Subject** - where the lesson belongs.
- **Title** - lesson name.
- **Curriculum slot** - Week and Day placement on the subject page.
- **Free preview** - allows guests and free-tier users to watch the full lesson.
- **Duration** - shown to students. Leave at 0 to hide.
- **Lesson Video** - MP4, WebM, or MOV, maximum 2 GB.

### Required Fields

- **Subject**
- **Title**

### Statuses Or Indicators

Lessons do not show Draft or Published statuses in the current admin page.

Visible indicators:

- **Free Preview: Yes**
- **Free Preview: No**
- Video uploaded check mark
- No video placeholder

### View Or Search Records

Use **Search lessons...** to search by lesson title, subject, week, day, free preview status, duration, or video status.

### Edit Or Update Records

1. Select the edit button on the lesson row.
2. Update the lesson fields.
3. Replace the video if needed.
4. Select **Save changes**.

### Delete Records

1. Select the delete button on the lesson row.
2. Review the confirmation.
3. Select **Delete**.

### Warnings

- Week and Day drive the curriculum grid on the subject page.
- The same subject cannot use the same Week and Day slot for two lessons.
- A subject can have up to 6 days in one week.
- Deleting a lesson shows: "This cannot be undone."

### What Happens After Saving

The lesson list updates, and a success message appears. If a video was uploaded, the row shows the uploaded video indicator.

## Problem Sets

### What The Page Is For

The **Problem Sets** page manages practice problem sets attached to lessons. It also manages problem set categories and scoring templates.

The page has three tabs:

- **Problem Sets**
- **Categories**
- **Scoring / Grades**

## Problem Sets Tab

### What Admins Can See

Admins can see:

- **Problem Set** title
- Lesson and subject
- **Category**
- **Questions** count
- **Status**
- **Order**
- Available row actions

### What Admins Can Do

- Create a problem set.
- Search problem sets.
- Edit a problem set.
- Add, remove, reorder, and preview questions.
- Upload question, option, or answer images.
- Delete a problem set.

### How To Create A New Problem Set

1. Go to **Problem Sets**.
2. Open the **Problem Sets** tab.
3. Select **New Problem Set**.
4. Select a **Lesson**.
5. Enter the **Problem Set Title**.
6. Select a **Category**.
7. Set **Sort Order**.
8. Choose **Status**.
9. Add a **Description** if needed.
10. Turn **Randomize Questions** on only if students should see questions in a different order each attempt.
11. Add at least one question.
12. Select the correct answer by clicking the option row.
13. Select **Create problem set**.

### Important Fields

- **Lesson** - lesson where the problem set appears.
- **Problem Set Title** - title shown to admins and students.
- **Category** - tab grouping for the lesson page.
- **Sort Order** - display order.
- **Status** - Draft or Published.
- **Description** - optional instructions or details, up to 1000 characters.
- **Randomize Questions** - controls question order for students.
- **Questions** - each question can use text, images, options, a correct answer, and an optional answer explanation.

### Required Fields

- **Lesson**
- **Problem Set Title**
- **Category**
- At least one question
- Each question needs question text or a question image.
- Each question needs at least 2 options.
- Each option needs text or an image.

### Statuses

- **Published**
- **Draft**

### View Or Search Records

Use **Search problem sets...** to search by title, lesson, subject, category, description, status, question count, or order.

### Edit Or Update Records

1. Select the edit button on a problem set row.
2. Wait for **Loading problem set...** if it appears.
3. Update the problem set details or questions.
4. Select **Save changes**.

### Delete Records

1. Select the delete button on the problem set row.
2. Review the confirmation.
3. Select **Delete**.

### Warnings

- A category must exist before a problem set can be created.
- After a problem set is created, the **Lesson** cannot be changed from the edit form.
- Deleting a problem set shows: "This cannot be undone."
- Use the preview button inside a question to check how text, images, and math expressions will appear.

### What Happens After Saving

The modal closes, the problem set list refreshes, and a success message appears.

## Categories Tab

### What Admins Can See

Admins can see:

- Category name
- **Order**
- Number of problem sets using the category

### What Admins Can Do

- Create a category.
- Search categories.
- Edit a category.
- Delete an unused category.

### How To Create A New Category

1. Go to **Problem Sets**.
2. Open the **Categories** tab.
3. Select **New Category**.
4. Enter **Category Name**.
5. Set **Sort Order**.
6. Select **Create category**.

### Required Fields

- **Category Name**

### Warnings

- Category names are used as lesson-page tab labels.
- Categories currently used by problem sets cannot be deleted.

### What Happens After Saving

The category list refreshes. New categories become available when creating or editing problem sets.

## Scoring / Grades Tab

### What Admins Can See

Admins can see:

- Template title
- Lesson and subject
- **Max** score
- **Bands**
- Available row actions

### What Admins Can Do

- Create a scoring template.
- Search scoring templates.
- Edit a scoring template.
- Add or remove grade bands.
- Delete a scoring template.

### How To Create A New Scoring Template

1. Go to **Problem Sets**.
2. Open the **Scoring / Grades** tab.
3. Select **New Scoring Template**.
4. Enter **Name / Title**.
5. Enter **Total Questions / Max Score**.
6. Select a **Lesson**.
7. Review or edit **Grade Bands**.
8. Add bands if needed with **Add Band**.
9. Select **Create template**.

### Required Fields

- **Name / Title**
- **Total Questions / Max Score**
- **Lesson**
- At least one grade band
- Each band needs **Min**, **Max**, and **Class**.

### Warnings

- Score ranges are inclusive.
- Gaps are allowed.
- Overlapping bands are rejected.
- A lesson can have only one scoring template.
- **Max Score** must be greater than zero.

### What Happens After Saving

The scoring template list refreshes, and the template becomes available for that lesson's results.

## Books

### What The Page Is For

The **Books** page manages book catalog items for sale.

### What Admins Can See

Admins can see:

- **Cover**
- **Book** title and author
- **Stock**
- **Price**
- **Status**
- Available row actions

The page summary shows total books and how many are published.

### What Admins Can Do

- Add a book.
- Search books.
- Publish or unpublish a book.
- Edit book details.
- Delete a book if allowed.

### How To Create A New Book

1. Go to **Books**.
2. Select **New Book**.
3. Upload a **Cover** if available.
4. Enter the **Title**.
5. Add **Author**, **ISBN**, and **Description** if available.
6. Enter **Price (PHP)**.
7. Enter **Stock**.
8. Choose **Status**.
9. Select **Create book**.

### Important Fields

- **Cover** - optional image. JPG, PNG, or WebP, maximum 5 MB.
- **Title** - book title.
- **Author** - author name.
- **ISBN** - optional book identifier.
- **Description** - shown on the catalog and detail page.
- **Price (PHP)** - customer price.
- **Stock** - available inventory count.
- **Status** - visibility and record state.

### Required Fields

- **Title**
- **Price (PHP)**

**Stock** must be a non-negative whole number. **Price (PHP)** must be a non-negative number.

### Statuses

- **Draft** - not visible to customers.
- **Published** - visible to customers.
- **Archived** - hidden, retained for orders.

### View Or Search Records

Use **Search books...** to search by title, author, stock, price, or status.

### Edit Or Update Records

1. Select the edit button on the book row.
2. Update the book details.
3. Select **Save changes**.

### Publish, Unpublish, Archive, Or Delete Records

To publish or unpublish:

1. Select the publish/unpublish button on the book row.
2. The status changes between **Published** and **Draft**.

To archive:

1. Edit the book.
2. Change **Status** to **Archived - hidden, retained for orders**.
3. Select **Save changes**.

To delete:

1. Select the delete button on the book row.
2. Review the confirmation.
3. Select **Delete**.

### Warnings

- Books with existing orders cannot be deleted.
- A stock value of 0 is shown as a warning in the list.
- Archive books that should be kept for order history instead of deleting them.

### What Happens After Saving

The book list updates, and a success message appears.

## Users

### What The Page Is For

The **Users** page lets admins view registered accounts, edit user profile details, manage roles, and reset device slots.

### What Admins Can See

Admins can see:

- User name
- Email address
- Mobile number, if available
- **Role**
- **Subscription**
- **Joined** date

The page summary shows total users and admin count.

### What Admins Can Do

- Search users.
- Filter by **All**, **Admins**, or **Users**.
- Promote a user to **Admin**.
- Demote an admin to **User**.
- Edit user profile details.
- Reset a user's desktop, mobile, or all device slots.

### How To Create A New User

There is no visible **New User** action in the current Admin Panel.

**Needs confirmation:** How admin staff should create a new user account if one must be created manually.

### Important Fields Admins Can Edit

- **First name**
- **Last name**
- **Mobile number**
- **School**
- **School ID**

### Required Fields

When editing user info:

- **First name**
- **Last name**

### Statuses

Role statuses:

- **Admin**
- **User**

Subscription badges:

- **Standard**
- **Free**

### View Or Search Records

Use **Search users...** to search by name, email, role, subscription, or mobile number.

Use the filters:

- **All**
- **Admins**
- **Users**

### Edit Or Update Records

1. Select the edit button on the user row.
2. Update the editable profile fields.
3. Select **Save**.

### Change Roles

To promote a user:

1. Select the **User** role badge.
2. Review the confirmation.
3. Select **Confirm**.

To demote an admin:

1. Select the **Admin** role badge.
2. Review the confirmation.
3. Select **Confirm**.

### Reset Devices

1. Open the device reset actions menu on the user row.
2. Choose one:
   - **Reset Desktop Device**
   - **Reset Mobile Device**
   - **Reset All Devices**
3. Review the confirmation.
4. Select **Confirm reset**.

### Delete, Disable, Or Archive Users

The current Admin Panel does not show a user delete, disable, or archive action.

### Warnings

- Only promote trusted staff to **Admin**. Admins can manage sensitive platform content and user access.
- Resetting device slots deactivates the selected active device slots for that user.

### What Happens After Saving

The user row updates, and a success message appears. Role changes and device resets also show success messages after completion.

## Announcements

### What The Page Is For

The **Announcements** page manages homepage announcements.

### What Admins Can See

Admins can see:

- **Announcement** title and body preview
- **Publish date**
- **Order**
- **Status**
- Available row actions

The page summary shows total announcements and how many are enabled.

### What Admins Can Do

- Create an announcement.
- Search announcements.
- Enable or disable an announcement.
- Edit an announcement.
- Delete an announcement.
- Schedule an announcement by using a future publish date.

### How To Create A New Announcement

1. Go to **Announcements**.
2. Select **New Announcement**.
3. Enter the **Title**.
4. Add the **Body**.
5. Set **Publish at**.
6. Set **Display order**.
7. Add **CTA label** and **CTA link** if needed.
8. Add **Icon** and **Category** if needed.
9. Keep **Enabled** checked if the announcement should appear when the publish date has passed.
10. Select **Create announcement**.

### Important Fields

- **Title** - announcement heading.
- **Body** - short text. The form recommends 1 to 3 sentences.
- **Publish at** - date and time when the announcement can go live.
- **Display order** - lower numbers appear higher on the page.
- **CTA label** - optional button text.
- **CTA link** - optional button link.
- **Icon** - optional icon name.
- **Category** - optional category label.
- **Enabled** - controls whether the announcement can appear publicly.

### Required Fields

- **Title**
- **Publish at**

If using a CTA, both **CTA label** and **CTA link** are required together.

### Statuses

- **Disabled** - not visible because Enabled is off.
- **Scheduled** - enabled, but the publish date is in the future.
- **Live** - enabled and the publish date has passed.

### View Or Search Records

Use **Search announcements...** to search by title, body, publish date, display order, or status.

### Edit Or Update Records

1. Select the edit button on the announcement row.
2. Update the fields.
3. Select **Save changes**.

### Enable, Disable, Or Delete Records

To enable or disable:

1. Select the enable/disable button on the announcement row.
2. The status updates based on Enabled and Publish at.

To delete:

1. Select the delete button on the announcement row.
2. Review the confirmation.
3. Select **Delete**.

### Warnings

- Future dates schedule the announcement.
- An announcement must be **Enabled** and past its publish date to be **Live**.
- CTA fields must be both filled in or both left blank.

### What Happens After Saving

The announcement list updates, and a success message appears.

## Welcome Videos

### What The Page Is For

The **Welcome Videos** page manages the homepage welcome video card.

### What Admins Can See

Admins can see:

- **Thumb**
- **Video** title and video URL
- **Order**
- **Status**
- Available row actions

The page summary shows total welcome videos, enabled count, and that 1 video is shown on the homepage.

### What Admins Can Do

- Create a welcome video entry.
- Search welcome videos.
- Enable or disable a welcome video.
- Edit a welcome video.
- Delete a welcome video.

### How To Create A New Welcome Video

1. Go to **Welcome Videos**.
2. Select **New Welcome Video**.
3. Upload a **Thumbnail** if available.
4. Enter the **Title**.
5. Add a **Description**.
6. Add the **Video URL**, or leave it blank to show the thumbnail only.
7. Add **CTA label** and **CTA link** if needed.
8. Set **Display order**.
9. Keep **Enabled** checked if it should be eligible to appear on the homepage.
10. Select **Create welcome video**.

### Important Fields

- **Thumbnail** - optional image. JPG, PNG, or WebP, maximum 5 MB.
- **Title** - video title.
- **Description** - one or two sentences below the video.
- **Video URL** - YouTube, Vimeo, or direct MP4 URL.
- **CTA label** - optional button text.
- **CTA link** - optional button link.
- **Display order** - controls which enabled row appears first.
- **Enabled** - makes the row eligible to appear on the homepage.

### Required Fields

- **Title**

If using a CTA, both **CTA label** and **CTA link** are required together.

### Statuses

- **Disabled** - not eligible to appear.
- **Live** - the enabled row currently shown on the homepage.
- **Standby** - enabled, but another enabled row has higher priority.

### View Or Search Records

Use **Search welcome videos...** to search by title, video URL, display order, or status.

### Edit Or Update Records

1. Select the edit button on the welcome video row.
2. Update the fields.
3. Select **Save changes**.

### Enable, Disable, Or Delete Records

To enable or disable:

1. Select the enable/disable button on the row.
2. The row status updates.

To delete:

1. Select the delete button on the row.
2. Review the confirmation.
3. Select **Delete**.

### Warnings

- Only the enabled row with the lowest display order is shown on the homepage.
- Enabled rows that are not shown are marked **Standby**.
- Direct MP4 videos can use the uploaded thumbnail as a poster image.
- YouTube and Vimeo embeds provide their own preview image.

### What Happens After Saving

The welcome video list updates, and a success message appears.

## Orders

### What The Page Is For

The **Orders** page lets admins review and fulfill book orders.

### What Admins Can See

Admins can see:

- Ordered book
- Short order ID and order date
- Customer name
- **Status**
- **Total**
- Available open action

Inside **Order detail**, admins can see:

- Current status
- Ordered date and time
- Item details
- Quantity, unit price, and total
- Shipping name, phone, address, and notes
- Tracking number, when applicable
- Payment, shipping, delivery, or cancellation timestamps

### What Admins Can Do

- Search orders.
- Filter orders by status.
- Open order details.
- Mark a pending order as paid.
- Mark a paid order as shipped.
- Add a tracking number when shipping.
- Mark a shipped order as delivered.
- Cancel an order before it reaches a final state.

### How To Create A New Order

There is no visible **New Order** action in the Admin Panel. Orders appear after customer checkout.

### Required Fields

Admins do not fill required fields when creating orders because orders are not created manually in the current Admin Panel.

When marking an order as shipped, **Tracking number** is available but not shown as required.

### Statuses

- **Pending**
- **Paid**
- **Shipped**
- **Delivered**
- **Cancelled**

### View Or Search Records

Use **Search orders...** to search by order ID, book title, customer name, status, total, or tracking number.

Use status filters:

- **All**
- **Pending**
- **Paid**
- **Shipped**
- **Delivered**
- **Cancelled**

### Edit Or Update Records

1. Open an order from the list.
2. Review the **Order detail**.
3. Use the available action for the current status:
   - **Mark as paid**
   - **Mark as shipped**
   - **Mark as delivered**
4. Add or update the tracking number before marking as shipped if available.

### Cancel Records

1. Open the order.
2. Select **Cancel order**.

Delivered and cancelled orders are final in the current admin view and do not show further action buttons.

### Warnings

- Use **Mark as paid** only after payment has been confirmed. **Needs confirmation:** the exact staff procedure for verifying payment before using this manual action.
- Cancelling an order returns the ordered quantity to stock.
- Review the shipping address carefully before marking an order as shipped.

### What Happens After Saving Changes

The order status updates, the related timestamp is recorded, and the list reflects the new status.

## Subscriptions

### What The Page Is For

The **Subscriptions** page manages paid access, subscription status, and expiry dates.

### What Admins Can See

Admins can see:

- User name
- **Plan**
- **Status**
- **Expires**
- Available actions
- Start date shown as **Since**

The page summary shows total subscriptions plus counts for active, expired, and inactive.

### What Admins Can Do

- Search subscriptions.
- Filter by subscription status.
- Activate an inactive subscription.
- Deactivate an active subscription.
- Renew an expired subscription.
- Extend an active subscription.
- Set a custom expiry date.
- Add an optional reason note when renewing, extending, or setting expiry.

### How To Create A New Subscription

There is no visible **New Subscription** button in the current Admin Panel.

Admins can renew, extend, activate, or set expiry for subscription records that already appear on the **Subscriptions** page.

**Needs confirmation:** How admin staff should create a subscription for a user who does not already appear on the Subscriptions page.

### Important Fields

- **Duration** - available choices are **1 Month**, **3 Months**, **6 Months**, or **Custom Date**.
- **Expiry date** - required when using **Custom Date** or **Set Expiry**.
- **Reason** - optional note for the audit log.

### Required Fields

- A duration is required for renewals or extensions unless using **Custom Date**.
- **Expiry date** is required when setting a custom expiry.
- The expiry date must be in the future.

### Statuses

- **Active** - access is currently available.
- **Expired** - expiry date has passed.
- **Inactive** - access is turned off.

Other labels:

- **Standard** - paid plan shown in the Plan column.
- **No Expiry** - no expiry date is set.

### View Or Search Records

Use **Search subscriptions...** to search by user name, plan, tier, status, expiry date, or active/inactive text.

Use filters:

- **All**
- **Active**
- **Expired**
- **Inactive**

### Edit Or Update Records

Available buttons depend on the subscription:

- **Renew** - shown for expired subscriptions.
- **Extend** - shown for active subscriptions with an expiry date.
- **Set Expiry** - shown when an active subscription has no expiry.
- **Activate** - shown for inactive subscriptions.
- **Deactivate** - shown for active subscriptions that are not expired.

To renew or extend:

1. Select **Renew** or **Extend**.
2. Choose **1 Month**, **3 Months**, **6 Months**, or **Custom Date**.
3. Enter a **Reason** if needed.
4. Select **Renew Subscription** or **Extend Subscription**.

To set expiry:

1. Select **Set Expiry**.
2. Choose an **Expiry date**.
3. Enter a **Reason** if needed.
4. Select **Save Expiry**.

To activate or deactivate:

1. Select **Activate** or **Deactivate**.
2. Review the confirmation.
3. Select **Confirm**.

### Delete, Cancel, Or Archive Records

The current Admin Panel does not show a delete, cancel, or archive action for subscriptions. Use **Deactivate** to turn off access.

### Warnings

- Expired subscriptions should be renewed instead of simply restored.
- Active subscriptions should be extended instead of renewed.
- Inactive subscriptions may need to be activated before they can be extended.
- A subscription with no expiry requires **Set Expiry**.
- Custom expiry dates must be future dates.

### What Happens After Saving Changes

The subscription row updates with the new status, plan, and expiry information. A success message appears.

## Common Workflows

### Adding A Course

1. Go to **Courses**.
2. Select **New course**.
3. Enter **Name**.
4. Review or edit **Slug**.
5. Add **Description** if needed.
6. Choose **Draft**, **Published**, or **Archived**.
7. Select **Create course**.

### Adding A Subject

1. Create the parent course first if needed.
2. Go to **Subjects**.
3. Select **New Subject**.
4. Enter **Title**.
5. Set **Order**.
6. Select the **Course**.
7. Add a thumbnail and description if available.
8. Select **Create subject**.
9. Use the row publish button when the subject is ready.

### Adding A Lesson

1. Go to **Lessons**.
2. Select **New Lesson**.
3. Select the **Subject**.
4. Enter **Title**.
5. Set **Week** and **Day**.
6. Turn on **Free preview** only if intended.
7. Add duration and upload the lesson video if available.
8. Select **Create lesson**.

### Creating A Problem Set

1. Go to **Problem Sets**.
2. Open **Categories** and create a category if none exists.
3. Return to **Problem Sets**.
4. Select **New Problem Set**.
5. Select the **Lesson**.
6. Enter the **Problem Set Title**.
7. Select **Category** and **Status**.
8. Add questions and options.
9. Select the correct answer for each question.
10. Add answer explanations if needed.
11. Select **Create problem set**.

### Adding Or Editing A Book

1. Go to **Books**.
2. Select **New Book**, or edit an existing book.
3. Fill in the book details.
4. Enter **Price (PHP)** and **Stock**.
5. Choose **Draft**, **Published**, or **Archived**.
6. Select **Create book** or **Save changes**.

### Managing Users

1. Go to **Users**.
2. Search for the user.
3. Edit profile details if needed.
4. Promote or demote roles only after confirming the user should have that access.
5. Use device reset actions when a user needs to free up a desktop, mobile, or all device slots.

### Posting An Announcement

1. Go to **Announcements**.
2. Select **New Announcement**.
3. Enter **Title** and **Body**.
4. Set **Publish at**.
5. Keep **Enabled** checked if it should go live.
6. Add CTA fields only if both label and link are ready.
7. Select **Create announcement**.

### Managing Welcome Videos

1. Go to **Welcome Videos**.
2. Select **New Welcome Video**, or edit an existing video.
3. Add the title, description, thumbnail, video URL, and CTA if needed.
4. Set **Display order**.
5. Enable the row if it should be eligible for the homepage.
6. Remember that only the enabled row with the lowest order is **Live**.

### Checking Orders

1. Go to **Orders**.
2. Filter by **Pending**, **Paid**, or **Shipped**.
3. Open each order and review customer and shipping details.
4. Confirm payment before using **Mark as paid**.
5. Add tracking before or when using **Mark as shipped**.
6. Use **Mark as delivered** after delivery is confirmed.
7. Use **Cancel order** only when cancellation is correct.

### Creating Or Extending A Subscription

For an existing subscription row:

1. Go to **Subscriptions**.
2. Search for the user.
3. If the subscription is **Expired**, select **Renew**.
4. If the subscription is **Active**, select **Extend**.
5. If the subscription is **Inactive**, select **Activate** first if access should be restored.
6. If the subscription has **No Expiry**, select **Set Expiry**.
7. Choose a duration or custom expiry date.
8. Add a **Reason** if helpful.
9. Select the save button shown in the modal.

**Needs confirmation:** The Admin Panel does not show how to create a brand-new subscription for a user with no existing subscription row.

## Daily Admin Checklist

- Check **Dashboard** for unusual changes in users, active subscriptions, and lesson completions.
- Review **Orders** with **Pending**, **Paid**, or **Shipped** status.
- Check **Subscriptions** for expired or inactive accounts that need staff action.
- Review new user support requests and reset devices only when appropriate.
- Confirm homepage **Announcements** and **Welcome Videos** are showing the intended live content.

## Weekly Admin Checklist

- Review **Courses** and **Subjects** for drafts, archived items, and publishing accuracy.
- Check lesson Week and Day placement for new or edited **Lessons**.
- Review **Problem Sets** for missing categories, draft sets, question counts, and scoring templates.
- Check **Books** for stock level, pricing, published status, and archived items.
- Review **Users** with admin roles and confirm only trusted staff have admin access.
- Review **Subscriptions** for upcoming expirations, expired accounts, and inactive records.
- Confirm old announcements or welcome videos are disabled, deleted, or reordered as needed.

