# Domain: Courses & Subjects (Catalog)

## Purpose
The content catalog students browse. Two levels: **Course** (parent grouping) →
**Subject** (the studyable unit). Students bookmark Subjects ("saved subjects").

> ⚠️ **Naming.** DB table `subjects` = what students study; `courses` = the
> parent grouping. URLs are legacy: `/courses` lists Subjects, `/course/:id` is a
> Subject, `/admin/courses` manages Subjects, `/admin/categories` manages parent
> Courses. See [../adr/0007-course-subject-rename.md](../adr/0007-course-subject-rename.md).

## Core entities
| Entity | Table | Type | Notes |
|---|---|---|---|
| Course (parent) | `courses` | `@s-class/types/courses` `Course` | name, slug, description, subjectCount |
| Subject (child) | `subjects` | `@s-class/types/subjects` `Subject` | title, description, thumbnail(+url), category(legacy), courseId, difficulty, tags, isPublished |
| Saved subject | `saved_subjects` | — | per-user bookmark |

## User journeys

### Browse & discover
- `SubjectsPage` (`/courses`) lists published subjects. `useSubjects` (250 lines)
  does **client-side** search (title/description/tags), category & duration &
  difficulty filters, and sort (relevant/newest/A–Z/most-lessons).
- `SubjectDetailPage` (`/course/:id`) shows the subject + its **Week→Day curriculum
  grid** (`features/subjects/components/curriculum.tsx`) built from
  `lesson_previews` (premium-safe). Free-preview lessons are marked playable.
- Guests reach subjects via the landing **preview funnel**
  (`/preview/subject/:id` → `SubjectDetailPage previewMode`).

### Save / track
- Bookmark toggles via `savedSubjectsApi` with **optimistic update + rollback**
  in `useSavedSubjectsStore`. Saved subjects + per-subject progress show on the
  dashboard.

### Admin management
- `AdminCoursesPage` (`/admin/categories`) — CRUD parent Courses (`SubjectModal`'s
  sibling `CourseModal`/types in `features/courses`).
- `AdminSubjectsPage` (`/admin/courses`) — CRUD Subjects (`SubjectModal`):
  title, description, parent course, thumbnail upload, publish toggle.

## Business rules
- **Only `is_published = true` subjects are public.** Admins see drafts (RLS
  `subjects: admin reads all`).
- **Search is client-side today** despite the DB having `tsvector` +
  trigram/GIN indexes ready for server-side search at scale (see
  [../performance.md](../performance.md)).
- **Parent course deletion sets `subjects.course_id = NULL`** (SET NULL) — subjects
  survive, just unassigned. The legacy `subjects.category` text is still populated.
- **Thumbnails** can be a Tailwind gradient string *or* an image URL; image covers
  are served via the Pages `/thumbnails` proxy (hosts rewritten across migrations
  to `s-class.com.ph`).

## Dependencies
- **Lessons** belong to subjects; curriculum grid + counts come from lessons.
- **Analytics:** dashboard progress = watched lessons / total lessons per saved subject.
- **Memberships:** browsing is public; *playing* lesson media needs a subscription
  (or free-preview).

## Key files
`@s-class/api/{subjectApi,subject.service,coursesApi}.ts`,
`src/features/subjects/*`, `src/pages/SubjectDetailPage.tsx`,
`apps/portal/src/pages/SubjectsPage.tsx`,
`apps/admin/src/pages/admin/{AdminSubjectsPage,AdminCoursesPage}.tsx`.
