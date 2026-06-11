# Indexes

Indexes after all migrations (post-rename names where applicable).

## Lessons
| Index | Definition | Purpose |
|---|---|---|
| `idx_lessons_subject_order` | `(subject_id, "order")` | ordered lesson list in a subject (was `idx_lessons_course_order`) |
| `idx_lessons_subject_week_day` | `(subject_id, week_number, day_number)` | Week→Day curriculum grid |
| `lessons_is_free_preview_idx` | `(is_free_preview) WHERE is_free_preview` | preview lookups |

## Subjects *(indexes renamed from `courses` → `subjects` in the rename migration)*
| Index | Definition | Purpose |
|---|---|---|
| `idx_subjects_search_vector` | GIN `(search_vector)` | full-text search |
| `idx_subjects_title_trgm` | GIN `(title gin_trgm_ops)` | fuzzy ILIKE on title |
| `idx_subjects_description_trgm` | GIN `(description gin_trgm_ops)` | fuzzy ILIKE on description |
| `idx_subjects_tags` | GIN `(tags)` | tag containment |
| `idx_subjects_created_at` | `(created_at DESC) WHERE is_published` | "Newest" sort |
| `idx_subjects_category` | `(category) WHERE is_published` | legacy text category filter |
| `idx_subjects_difficulty` | `(difficulty) WHERE is_published` | difficulty filter |
| `idx_subjects_course_id` | `(course_id)` | subject → parent course (was `idx_courses_category_id`) |

## Courses *(was categories)*
| Index | Definition | Purpose |
|---|---|---|
| `idx_courses_slug` | `(slug)` | slug lookups (was `idx_categories_slug`) |

## Quizzes / quiz_results
| Index | Definition | Purpose |
|---|---|---|
| `idx_quizzes_lesson_order` | `(lesson_id, "order")` | from `schema.sql` (legacy one-row-per-question era) |
| `idx_quiz_results_user` | `(user_id, lesson_id)` | per-user result lookup |

## Subscriptions
| Index | Definition | Purpose |
|---|---|---|
| `idx_subscriptions_active` | `(user_id) WHERE is_active` | fast `is_active_subscriber()` |

## Payments
| Index | Definition | Purpose |
|---|---|---|
| `payments_user_id_idx` | `(user_id)` | user history |
| `payments_status_idx` | `(status)` | admin filtering |

## Books / orders
| Index | Definition | Purpose |
|---|---|---|
| `books_status_created_idx` | `(status, created_at DESC)` | public catalog (replaced `books_published_idx`) |
| `book_orders_user_idx` | `(user_id, ordered_at DESC)` | "my orders" |
| `book_orders_status_idx` | `(status, ordered_at DESC)` | admin order queue |
| `book_orders_book_idx` | `(book_id)` | per-book orders |

## Devices
| Index | Definition | Purpose |
|---|---|---|
| `user_devices_user_active_idx` | `(user_id, is_active)` | active-device count |
| `user_devices_active_one_per_kind_idx` | UNIQUE `(user_id, device_kind) WHERE is_active` | **enforces the cap** (concurrent insert → 23505) |

## Homepage CMS
| Index | Definition | Purpose |
|---|---|---|
| `announcements_public_idx` | `(display_order ASC, published_at DESC) WHERE enabled` | public homepage query |
| `welcome_videos_public_idx` | `(display_order ASC, created_at DESC) WHERE enabled` | public homepage query |

## Extensions
- `pg_trgm` — trigram fuzzy matching for subject search (`add_course_search_indexes.sql`).

## Notes
- Most filter indexes are **partial** (`WHERE is_published` / `WHERE enabled` /
  `WHERE is_active`) — they only index hot rows, keeping them small.
- `lesson_progress` has no extra index beyond its `UNIQUE(user_id, lesson_id)`;
  dashboard aggregates scan per-user, fine at current scale.
- See [performance.md](../performance.md) for query/index observations at scale.
