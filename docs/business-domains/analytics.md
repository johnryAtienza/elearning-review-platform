# Domain: Analytics & Progress

## Purpose
Give students a sense of progress and give admins basic platform metrics. This is
**aggregate reporting over existing tables**, not a separate analytics pipeline —
there is no event tracking, no warehouse, no third-party analytics SDK.

## Student-facing analytics

### Dashboard (`DashboardPage`)
Driven by two RPCs (`@s-class/api/savedSubjectsApi` → `useSavedSubjectsStore`):

| Metric | Source |
|---|---|
| Subjects saved | `get_dashboard_stats()` → `subjects_saved` |
| Lessons completed | `get_dashboard_stats()` → `lessons_completed` (watched count) |
| Quizzes taken | `get_dashboard_stats()` → `quizzes_taken` (`quiz_results` count) |
| Per-subject progress bars | `get_saved_subjects_progress()` (watched / total lessons) |

### Quiz history (`QuizHistoryPage`)
`get_quiz_history(limit)` → newest-first attempts joined to lesson + subject
titles (`useQuizHistoryStore`).

## Admin-facing analytics

### Admin dashboard (`AdminDashboardPage`)
`admin.service.ts` `AdminStats`:
| Metric | Source |
|---|---|
| Total / published courses(subjects) | `subjects` count |
| Total lessons | `lessons` count |
| Total users | `profiles` count |
| Active subscriptions | `subscriptions` where active |
| Students who completed ≥1 lesson | distinct `lesson_progress` users |
| Total lesson completions | `lesson_progress` watched count |

Admin SELECT access to `lesson_progress` (for completion stats) was granted in
`20260521000000_admin_read_lesson_progress.sql`.

## Business rules
- **All student aggregates scope to `auth.uid()`** inside SECURITY DEFINER RPCs.
- **Progress = explicit "mark watched"** (`lesson_progress.is_watched`), not video
  completion percentage.
- **Quiz "taken" counts every attempt** (history is full since the unique
  constraint was dropped).

## Gaps (see [../recommendations.md](../recommendations.md))
- No funnel/conversion analytics (preview → register → subscribe).
- No revenue reporting beyond raw `payments` rows.
- No cohort/retention analysis.
- No client-side product analytics (e.g. PostHog/GA) — only Cloudflare/Supabase
  dashboards.

## Key files
`@s-class/api/savedSubjectsApi.ts`, `@s-class/api/quizResultsApi.ts`,
`@s-class/auth/{savedSubjectsStore,quizHistoryStore}.ts`,
`packages/api/src/admin.service.ts` (`AdminStats`),
`apps/portal/src/pages/{DashboardPage,QuizHistoryPage}.tsx`,
`apps/admin/src/pages/admin/AdminDashboardPage.tsx`,
RPCs `get_dashboard_stats`, `get_saved_subjects_progress`, `get_quiz_history`.
