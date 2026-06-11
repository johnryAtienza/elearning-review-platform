# Domain: Quizzes

## Purpose
Per-lesson multiple-choice practice with scoring, optional answer explanations,
and persisted attempt history. Math is supported via KaTeX.

## Core entities
| Entity | Table | Notes |
|---|---|---|
| Quiz (parent) | `quizzes` | one per lesson: `lesson_id`, `description`, `randomize_questions` ⚠️ out-of-band shape |
| Question | `quiz_questions` | ⚠️ out-of-band table: `quiz_id`, `question`(+image), `options`/`choices`, `correct_answer`, `answer_text`, `answer_image_url` |
| Attempt | `quiz_results` | `score`, `total`, `answers` jsonb; **one row per attempt** |
| TS types | `@s-class/types/quiz` | `Quiz`, `QuizQuestion`, `QuizChoice`, `QuizResult` |

> The live quiz schema (parent `quizzes` + child `quiz_questions`) was created in
> the dashboard and is **not fully captured by migrations** — see
> [../database/tables.md](../database/tables.md).

## User journey
```mermaid
sequenceDiagram
  participant Q as QuizComponent
  participant QS as quizStore (active answers)
  participant QA as quizApi
  participant QR as quizResultsApi
  Q->>QA: getQuiz(lessonId)  (questions via RLS)
  Q->>QS: setAnswer per question
  Q->>Q: submit → score client-side (utils.ts)
  Q->>QR: saveResult(score,total,answers)
  Q->>ResultSummary: show score; reveal answers if allowed
```

`QuizComponent` (358 lines) renders questions (`MathText` for LaTeX), tracks
answers in `quizStore` (transient, not persisted), scores on submit, then
`ResultSummary` shows the score. Attempts are saved through `quizResultsApi` and
surfaced on the **Quiz History** page (`get_quiz_history` RPC →
`useQuizHistoryStore`).

## Business rules
- **Who can read questions:** active subscribers on any lesson, **or anyone
  (incl. guests)** on a `is_free_preview` lesson (RLS on `quizzes` +
  `quiz_questions`).
- **Who can save a result:** subscribers, or any authenticated user on a
  free-preview lesson (`user_id` pinned to `auth.uid()`).
- **Answer review** (`showAnswersAfterQuiz`) is a tier permission
  (`accessControl.ts`) — Standard tier sees correct answers; free tier sees score
  only. (Plus the explanation fields `answer_text`/`answer_image_url`.)
- **Full history:** the original `UNIQUE(user_id, lesson_id)` was dropped, so every
  retry is recorded.
- **`randomize_questions`** column exists but UI exposure is partial.

## ⚠️ Trust boundary
**The score is computed in the browser** (`features/quiz/utils.ts`) and inserted
by the user. RLS verifies *who* can insert and *for which lesson*, but does **not**
verify the score against the question key. Quiz scores are therefore
trust-the-client — acceptable for self-study, but not exam-grade. See
[../security.md](../security.md).

## Admin management
`AdminQuizzesPage` + `QuizModal` (**1004 lines — the largest component in the
repo**): create/edit a quiz per lesson, add questions with choices (text/image),
correct answer, explanation, and randomize toggle. CRUD via `admin.service.ts`
(`from('quizzes')`/`from('quiz_questions')`). A prime refactor target —
[../technical-debt.md](../technical-debt.md).

## Dependencies
- **Lessons:** quiz belongs to a lesson; preview flag governs guest access.
- **Memberships:** gates non-preview quizzes + answer review.
- **Analytics:** attempts feed `quizzes_taken` stat + history page.

## Key files
`src/features/quiz/*` (`QuizComponent`, `ResultSummary`, `utils.ts`),
`src/store/quizStore.ts`, `@s-class/api/{quizApi,quiz.service,quizResultsApi}.ts`,
`@s-class/auth/quizHistoryStore.ts`, `apps/admin/.../QuizModal.tsx`.
