# ELearning Review Platform — Comprehensive Documentation

> **Version:** 1.0  
> **Last Updated:** April 2026  
> **Stack:** React 19 · React Router 7 · Zustand · Supabase · Cloudflare R2 · Cloudflare Pages

---

## Table of Contents

**Developer Guide**
1. [Project Overview](#1-project-overview)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Codebase Structure](#3-codebase-structure)
4. [Core Features & System Behavior](#4-core-features--system-behavior)
5. [Setup & Development Guide](#5-setup--development-guide)
6. [Deployment Guide](#6-deployment-guide)
7. [Conventions & Best Practices](#7-conventions--best-practices)

**End-User Guide**

8. [User Manual](#8-user-manual)

**Appendix**
- [Potential Improvements](#potential-improvements)

---

# PART 1 — DEVELOPER GUIDE

---

## 1. Project Overview

### Purpose

The **ELearning Review Platform** is a subscription-based online learning application built for Filipino professional board exam review candidates. It delivers structured lesson content (video + PDF), practice quizzes, and progress tracking behind a subscription paywall.

### Target Users

| User Type | Description |
|---|---|
| **Learner / Reviewer** | A student using the platform to study for professional board exams |
| **Administrator** | A content creator or platform manager who uploads courses, lessons, quizzes, and manages users |

### Core Features

| Feature | Description |
|---|---|
| Course Catalog | Browse, search, and filter published courses |
| Video Lessons | HTML5 video player with preview limits for free-tier users |
| PDF Reviewer | Page-limited PDF viewer with content watermarking |
| Quizzes | Per-lesson multiple-choice quizzes with scoring and answer review |
| Subscription Plans | Free vs. Standard tier; 1, 3, or 6-month billing cycles |
| Saved Courses | Bookmark courses and track progress from the dashboard |
| Dashboard | Aggregated stats — courses saved, lessons completed, quizzes taken |
| Admin Panel | Full CRUD management of courses, lessons, quizzes, users, categories, and subscriptions |
| Content Protection | Signed URLs, watermarking, DevTools blocking, screen recording heuristics |

---

## 2. Tech Stack & Architecture

### Frontend

| Category | Library | Version |
|---|---|---|
| UI Framework | React | 19.2.4 |
| Routing | React Router | 7.13.2 |
| State Management | Zustand | 5.0.12 |
| Styling | Tailwind CSS | 4.2.2 |
| Icons | Lucide React | 1.7.0 |
| Math Rendering | KaTeX | 0.16.45 |
| PDF Viewing | react-pdf | 10.4.1 |
| Toast Notifications | Sonner | 2.0.7 |
| Build Tool | Vite | 6.x |
| Language | TypeScript | 5.x |

### Backend & Infrastructure

| Service | Role |
|---|---|
| **Supabase** | PostgreSQL database, Authentication, Row Level Security (RLS), Edge Functions |
| **Cloudflare R2** | Object storage for videos, PDFs, and thumbnails (S3-compatible) |
| **Cloudflare Pages** | Static site hosting with SPA routing support |

### Planned Integrations

| Service | Status | Purpose |
|---|---|---|
| PayMongo | Planned | Philippine payment gateway (GCash / Maya / credit cards) |

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Browser (React SPA)                        │
│                                                              │
│   Pages → Feature Components → Hooks → Zustand Stores       │
│                        │                                     │
│               Services / API Layer                           │
│         ┌──────────────────────────────┐                     │
│         │  apiClient.ts  (fetch wrap)  │                     │
│         │  supabaseClient.ts  (SDK)    │                     │
│         │  storageClient.ts  (AWS S3)  │                     │
│         └──────────────────────────────┘                     │
└──────────────────────┬──────────────────────────────────────┘
                       │  HTTPS
       ┌───────────────┼──────────────────┐
       ▼               ▼                  ▼
  Supabase DB    Edge Functions     Cloudflare R2
 (PostgreSQL +    (Deno runtime)   (Video / PDF /
    Auth +           │              Thumbnails)
    RLS)    ┌────────┴────────┐
            │                 │
        subscribe      get-signed-urls
                     generate-upload-url
```

**Key architectural decisions:**

- **Provider-agnostic services** — All API calls route through service wrappers that can point to mock data, a REST backend, or Supabase. Controlled by `VITE_AUTH_PROVIDER`. This means the frontend can be tested without a live backend.
- **RLS is the security boundary** — Supabase Row Level Security enforces all data access rules at the database level. Frontend access control (route guards, UI hiding) is for UX only and does not replace RLS.
- **Short-lived signed URLs** — Premium content (videos, PDFs) is never directly publicly accessible. Signed URLs with a 60-second TTL are issued by an Edge Function only after verifying the user's subscription tier.
- **Colocated feature code** — Each feature folder contains its own types, components, hooks, services, and mock data. Code is only moved to `src/components/` or `src/services/` when it is truly shared across features.

---

## 3. Codebase Structure

### Full Folder Map

```
elearning-review-platform/
├── public/
│   └── _redirects                        # Cloudflare Pages SPA routing rule
├── src/
│   ├── app/
│   │   └── router.tsx                    # All routes (createBrowserRouter)
│   ├── assets/                           # Static assets
│   ├── components/
│   │   ├── ui/                           # Generic UI primitives
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── skeleton.tsx
│   │   │   └── ErrorMessage.tsx
│   │   ├── ContentWatermark.tsx          # User ID + timestamp overlay
│   │   ├── CourseThumbnail.tsx           # Thumbnail with gradient fallback
│   │   ├── FileUpload.tsx                # Generic file picker + R2 upload
│   │   ├── ImageUpload.tsx               # Image picker + preview
│   │   ├── LogoutModal.tsx               # Logout confirmation dialog
│   │   └── MathText.tsx                  # KaTeX math renderer
│   ├── config.ts                         # Typed env var access (single entry point)
│   ├── constants/
│   │   ├── routes.ts                     # ROUTES object + parameterised helpers
│   │   └── upload.ts                     # File size limits per type
│   ├── features/
│   │   ├── admin/
│   │   │   └── components/
│   │   │       ├── AdminLayout.tsx       # Collapsible sidebar + header
│   │   │       ├── AdminTable.tsx        # Reusable data table
│   │   │       ├── CourseModal.tsx       # Create/edit course dialog
│   │   │       ├── LessonModal.tsx       # Create/edit lesson dialog
│   │   │       ├── QuizModal.tsx         # Create/edit quiz dialog
│   │   │       └── StatCard.tsx          # Dashboard metric card
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── GuestRoute.tsx        # Redirect to /dashboard if already logged in
│   │   │   │   ├── ProtectedRoute.tsx    # Redirect to /login if not authenticated
│   │   │   │   └── ProtectedAdminRoute.tsx  # Require admin role
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts            # Access authStore
│   │   │   │   └── useUserRole.ts        # Check user.role
│   │   │   ├── services/
│   │   │   │   └── authService.ts        # Thin wrapper over authApi
│   │   │   └── types.ts                  # User interface, UserRole union type
│   │   ├── categories/
│   │   │   └── types.ts                  # Category, CategoryOption interfaces
│   │   ├── courses/
│   │   │   ├── components/
│   │   │   │   ├── CourseCard.tsx        # Single course display card
│   │   │   │   ├── CourseList.tsx        # Responsive grid/list of cards
│   │   │   │   └── SavedCourseCard.tsx   # Dashboard course card with progress bar
│   │   │   ├── data/
│   │   │   │   └── courses.ts            # Mock course data
│   │   │   ├── hooks/
│   │   │   │   └── useCourses.ts         # Full-text search + filter + sort
│   │   │   ├── services/
│   │   │   │   └── courseService.ts      # Supabase queries
│   │   │   └── types.ts                  # Course, SortOption, DurationFilter types
│   │   ├── lessons/
│   │   │   ├── components/
│   │   │   │   ├── FileUpload.tsx        # Admin: upload video/PDF to R2
│   │   │   │   ├── LessonUploadForm.tsx  # Admin: lesson metadata form
│   │   │   │   ├── LessonList.tsx        # Sidebar list of lessons in a course
│   │   │   │   ├── PdfViewer.tsx         # react-pdf viewer with page limit
│   │   │   │   ├── VideoPlayer.tsx       # HTML5 video with duration limit
│   │   │   │   ├── ReviewerSection.tsx   # Study guide / reviewer content
│   │   │   │   ├── LessonCTAs.tsx        # Enroll / subscribe call-to-action
│   │   │   │   └── UpgradeOverlay.tsx    # "Subscribe to unlock" overlay
│   │   │   ├── hooks/
│   │   │   │   ├── useLesson.ts          # Load lesson + siblings + progress
│   │   │   │   └── useSecureContent.ts   # Fetch signed URLs from edge function
│   │   │   ├── services/
│   │   │   │   ├── lessonService.ts      # Supabase lesson queries
│   │   │   │   ├── lessonApi.ts          # Lesson provider router
│   │   │   │   ├── lessonUploadService.ts  # Admin upload flow
│   │   │   │   ├── reviewerService.ts    # Reviewer content queries
│   │   │   │   ├── lessonData.ts         # Mock lesson data
│   │   │   │   └── reviewerData.ts       # Mock reviewer content
│   │   │   └── types.ts                  # Lesson, ReviewerContent interfaces
│   │   ├── quiz/
│   │   │   ├── components/
│   │   │   │   ├── QuizComponent.tsx     # Interactive quiz renderer
│   │   │   │   └── ResultSummary.tsx     # Score display + answer review
│   │   │   ├── hooks/
│   │   │   │   └── useQuiz.ts            # Access quizStore
│   │   │   ├── services/
│   │   │   │   ├── quizService.ts        # Save/fetch quiz results (Supabase)
│   │   │   │   ├── quizApi.ts            # Quiz provider router
│   │   │   │   └── quizData.ts           # Mock quiz data
│   │   │   ├── types.ts                  # Quiz, QuizQuestion, QuizResult types
│   │   │   └── utils.ts                  # Quiz scoring helpers
│   │   └── subscription/
│   │       ├── components/
│   │       │   └── SubscribedRoute.tsx   # Optional gate for subscribed-only routes
│   │       ├── hooks/
│   │       │   └── useSubscription.ts    # Pricing + purchase flow
│   │       ├── services/
│   │       │   ├── subscriptionService.ts  # Price calculation + plan builder
│   │       │   └── accessControl.ts      # Tier-to-permissions mapping
│   │       └── types.ts                  # SubscriptionTier, DurationOption, etc.
│   ├── hooks/
│   │   ├── useContentProtection.ts       # Block DevTools keyboard shortcuts
│   │   ├── useScreenRecordingDetection.ts  # Heuristic screen capture detection
│   │   └── useDebounce.ts                # Generic debounce hook
│   ├── layouts/
│   │   ├── Navbar.tsx                    # Top navigation bar
│   │   ├── RootLayout.tsx                # Navbar + <Outlet> + Footer shell
│   │   └── AdminLayout.tsx               # Legacy admin layout (simple sidebar)
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── CoursesPage.tsx
│   │   ├── CourseDetailPage.tsx
│   │   ├── LessonPage.tsx
│   │   ├── SubscriptionPage.tsx
│   │   └── admin/
│   │       ├── AdminDashboardPage.tsx
│   │       ├── AdminCoursesPage.tsx
│   │       ├── AdminLessonsPage.tsx
│   │       ├── AdminQuizzesPage.tsx
│   │       ├── AdminUsersPage.tsx
│   │       ├── AdminSubscriptionsPage.tsx
│   │       └── AdminCategoriesPage.tsx
│   ├── services/
│   │   ├── apiClient.ts                  # Core fetch wrapper
│   │   ├── ApiError.ts                   # Typed HTTP error class
│   │   ├── authApi.ts                    # Multi-provider auth factory
│   │   ├── supabaseClient.ts             # Singleton Supabase JS client
│   │   ├── course.service.ts             # Supabase course queries
│   │   ├── courseApi.ts                  # Course API router
│   │   ├── lesson.service.ts             # Supabase lesson queries
│   │   ├── lessonApi.ts                  # Lesson API router
│   │   ├── lessonProgressApi.ts          # Mark lessons complete
│   │   ├── admin.service.ts              # All admin CRUD operations
│   │   ├── quiz.service.ts               # Quiz questions + save results
│   │   ├── quizApi.ts                    # Quiz API router
│   │   ├── savedCoursesApi.ts            # Save/unsave + RPC calls
│   │   ├── subscriptionApi.ts            # Call subscribe edge function
│   │   ├── categoriesApi.ts              # Category CRUD + slug helper
│   │   ├── secureContent.ts              # Call get-signed-urls edge function
│   │   ├── storageClient.ts              # Browser-side presigned PUT to R2
│   │   ├── storage.service.ts            # IStorageProvider interface (server-side)
│   │   ├── storagePaths.ts               # R2 path builders
│   │   └── tokenService.ts               # JWT read/write in localStorage
│   ├── store/
│   │   ├── authStore.ts                  # Auth state + session restoration
│   │   ├── quizStore.ts                  # Quiz answers + results
│   │   └── savedCoursesStore.ts          # Saved courses + progress + stats
│   └── utils/
│       └── cn.ts                         # clsx + tailwind-merge helper
├── supabase/
│   ├── functions/
│   │   ├── subscribe/index.ts            # Edge Function: create/extend subscription
│   │   ├── generate-upload-url/index.ts  # Edge Function: presigned PUT URL
│   │   └── get-signed-urls/index.ts      # Edge Function: signed GET URLs + tier check
│   ├── migrations/                       # SQL migration files (apply in order)
│   └── schema.sql                        # Initial DB schema
├── .env                                  # Local env vars (git-ignored)
├── .env.example                          # Safe template (commit this)
├── public/_redirects                     # Cloudflare Pages SPA rule
├── tsconfig.app.json
├── vite.config.ts
└── package.json
```

### Key Module Responsibilities

| Module | File(s) | What it does |
|---|---|---|
| Router | `src/app/router.tsx` | Defines all routes and wraps them with appropriate guards |
| Route Guards | `features/auth/components/` | ProtectedRoute, ProtectedAdminRoute, GuestRoute |
| Route Constants | `src/constants/routes.ts` | Single source of truth for all URL paths |
| Auth Store | `src/store/authStore.ts` | Holds user session, subscription state, isAdmin flag |
| Quiz Store | `src/store/quizStore.ts` | Tracks answers and results for the active quiz |
| Saved Courses Store | `src/store/savedCoursesStore.ts` | Saved course IDs, progress map, dashboard stats |
| HTTP Client | `src/services/apiClient.ts` | Fetch wrapper with auth headers + typed errors |
| Supabase Client | `src/services/supabaseClient.ts` | Singleton Supabase JS client |
| Admin Service | `src/services/admin.service.ts` | All CRUD for courses, lessons, quizzes, users, categories |
| Secure Content | `src/services/secureContent.ts` | Calls `get-signed-urls` edge function |
| Storage Client | `src/services/storageClient.ts` | Uploads files to R2 via presigned PUT URLs |
| Config | `src/config.ts` | Single typed entry point for all environment variables |

---

## 4. Core Features & System Behavior

### 4.1 Authentication Flow

**Provider selection** is controlled by `VITE_AUTH_PROVIDER`:

| Value | Backend |
|---|---|
| `supabase` | Supabase Auth — used in production |
| `rest` | Custom REST API (requires a backend server) |
| `mock` | Hardcoded test users — no network calls |

**Registration (Supabase):**

```
User fills RegisterPage
  → authStore.register(firstName, lastName, email, password, mobileNumber)
  → supabase.auth.signUp({ email, password, options: { data: { first_name, ... } } })
  → If email confirmation enabled: confirmationPending = true → show verification message
  → If auto-confirm: JWT stored → syncSubscription() → redirect to /dashboard
```

**Login (Supabase):**

```
User fills LoginPage
  → authStore.login(email, password)
  → supabase.auth.signInWithPassword({ email, password })
  → JWT + refresh token stored in localStorage
  → syncSubscription() → load subscription tier from DB
  → savedCoursesStore.fetch() → load bookmarks + progress
  → navigate to /dashboard
```

**Session Restoration (on page refresh):**

```
App mounts
  → authStore.initialize()
  → supabase.auth.getSession()
  → If session exists: restore user + syncSubscription()
  → isInitializing = false
  → Route guards unblock and render
```

> This prevents the "flash redirect" problem where a logged-in user briefly sees the login page on refresh.

**Admin Role:**
- Stored in `auth.users.app_metadata.role = 'admin'`
- Can only be set server-side (via SQL migration or Supabase dashboard — not from the frontend)
- `isAdmin` is derived from `user.role === 'admin'` in `authStore`

---

### 4.2 State Management

All global state is managed with **Zustand** — a minimal, hook-based state library.

#### `authStore`

```ts
// Access anywhere in the app
const { user, isAuthenticated, isAdmin, isSubscribed, subscription } = useAuthStore()
```

| State field | Type | Description |
|---|---|---|
| `user` | `User \| null` | Logged-in user profile |
| `isAuthenticated` | `boolean` | Session exists |
| `isAdmin` | `boolean` | User has admin role |
| `isSubscribed` | `boolean` | Active subscription exists |
| `subscription` | `ActiveSubscription \| null` | Tier, expiry, days remaining |
| `isInitializing` | `boolean` | True while session is being restored |
| `confirmationPending` | `boolean` | Awaiting email verification |

#### `quizStore`

```ts
const { answers, submitted, result, setAnswer, submitQuiz, resetQuiz } = useQuizStore()
```

- Tracks selected answers per question
- `submitQuiz(questions)` scores against `correctAnswer` fields
- Not persisted — resets on page reload

#### `savedCoursesStore`

```ts
const { savedIds, progressMap, stats, toggle, isSaved } = useSavedCoursesStore()
```

- Optimistic UI updates (add/remove respond instantly, then sync to DB)
- Rolls back on failure

---

### 4.3 API Structure & Data Flow

#### Service Layer Pattern

Every domain follows a two-layer structure:

```
<domain>Api.ts        ← Public interface imported by components/hooks
  ├── Mock provider   ← Returns hardcoded data (features/<domain>/data/)
  ├── Supabase service  ← Direct Supabase SDK queries
  └── REST provider   ← HTTP calls via apiClient.ts
```

The active provider is selected at runtime via environment variables. Components and hooks never import a provider directly — they import the router file (`courseApi.ts`, `lessonApi.ts`, etc.).

#### HTTP Client (`apiClient.ts`)

Used only in REST mode. All calls:
1. Prepend `VITE_API_BASE_URL`
2. Attach `Authorization: Bearer <token>` from localStorage
3. Parse JSON response
4. Throw typed `ApiError` on non-2xx status

#### Supabase Edge Functions

Three serverless functions handle operations that require secrets or server-side logic:

| Function | Trigger | What it does |
|---|---|---|
| `subscribe` | `POST /functions/v1/subscribe` | Creates or extends subscription with carryover logic |
| `generate-upload-url` | `POST /functions/v1/generate-upload-url` | Returns a presigned PUT URL for uploading files to R2 |
| `get-signed-urls` | `POST /functions/v1/get-signed-urls` | Checks subscription tier, returns presigned GET URLs (60s TTL) |

All functions require a valid JWT and read R2 credentials from `Deno.env.get()` — credentials are never exposed to the browser.

---

### 4.4 Subscription & Access Control

#### Tiers

| Feature | Free | Standard |
|---|---|---|
| Video playback | First 30 seconds | Full video |
| PDF reviewer | First 5 pages | Full document |
| Quiz attempts | Allowed | Allowed |
| Answer review after quiz | Hidden | Shown |
| Content watermark | Yes | Yes |

Limits are configurable via env vars — no code change needed to adjust them.

#### Plan Pricing

| Duration | Discount | Label |
|---|---|---|
| 1 month | 0% | — |
| 3 months | 10% off | Popular |
| 6 months | 20% off | Best Value |

Base price: `VITE_SUBSCRIPTION_BASE_PRICE` per month (default ₱299).

#### Access Flow for Premium Content

```
User opens LessonPage
  → useSecureContent(lessonId) → secureContent.fetchSignedUrls()
    → POST /get-signed-urls with JWT + lessonId
      → Edge Function checks subscriptions table
      → Signs video URL + PDF URL (60-second expiry)
      → Returns { videoUrl, pdfUrl, tier }
  → VideoPlayer renders with maxDuration based on tier
  → PdfViewer renders with maxPages based on tier
  → UpgradeOverlay shown if user hits the limit
```

#### Subscription Extension Logic

The `extend_subscription()` SQL function handles three scenarios:

| Scenario | Result |
|---|---|
| No prior subscription | `expires_at = NOW() + N months` |
| Currently active | `expires_at = current_expires_at + N months` (carryover) |
| Already expired | `expires_at = NOW() + N months` (fresh start) |

---

### 4.5 Content Protection

| Layer | Mechanism | Effectiveness |
|---|---|---|
| Signed URLs (60s TTL) | R2 + Edge Function | **Strong** — URLs expire quickly |
| Subscription tier check | Server-side in Edge Function | **Strong** — enforced at DB level |
| RLS on lessons table | Supabase Row Level Security | **Strong** — DB-level enforcement |
| Content watermark | `ContentWatermark.tsx` overlay | **Medium** — visual deterrent |
| DevTools keyboard blocking | `useContentProtection.ts` | **Weak** — shortcuts only, menu still works |
| Screen recording heuristic | `useScreenRecordingDetection.ts` | **Weak** — detection only, no prevention |

> Client-side protections are deterrents. The signed URL + server-side tier check is the primary security mechanism.

---

### 4.6 Routing

All routes are in `src/app/router.tsx` using `createBrowserRouter`.

| Path | Page | Guard |
|---|---|---|
| `/` | HomePage | None |
| `/login` | LoginPage | GuestRoute (redirect if logged in) |
| `/register` | RegisterPage | GuestRoute |
| `/courses` | CoursesPage | ProtectedRoute |
| `/course/:courseId` | CourseDetailPage | None |
| `/lesson/:lessonId` | LessonPage | ProtectedRoute |
| `/dashboard` | DashboardPage | ProtectedRoute |
| `/subscription` | SubscriptionPage | ProtectedRoute |
| `/admin` | AdminDashboardPage | ProtectedAdminRoute |
| `/admin/courses` | AdminCoursesPage | ProtectedAdminRoute |
| `/admin/lessons` | AdminLessonsPage | ProtectedAdminRoute |
| `/admin/quizzes` | AdminQuizzesPage | ProtectedAdminRoute |
| `/admin/users` | AdminUsersPage | ProtectedAdminRoute |
| `/admin/subscriptions` | AdminSubscriptionsPage | ProtectedAdminRoute |
| `/admin/categories` | AdminCategoriesPage | ProtectedAdminRoute |

---

### 4.7 Supabase Database Schema

#### Tables

| Table | Purpose |
|---|---|
| `profiles` | Extended user profile (mirrors `auth.users`) |
| `courses` | Course catalog |
| `lessons` | Lesson content metadata + storage paths |
| `lesson_previews` | VIEW — lesson metadata without premium URL columns |
| `quizzes` | Quiz questions per lesson |
| `subscriptions` | One row per user; tracks tier + expiry |
| `quiz_results` | Per-user quiz attempt history |
| `categories` | Course categories |
| `saved_courses` | User bookmarks |
| `lesson_progress` | Lesson completion tracking |

#### RPC Functions

| Function | Description |
|---|---|
| `extend_subscription(user_id, duration_months, tier)` | Handles subscription creation and carryover |
| `get_saved_courses_progress()` | Returns course + watched/total lesson counts |
| `get_dashboard_stats()` | Returns coursesSaved, lessonsCompleted, quizzesTaken |

#### Row Level Security Summary

- Learners read only their own subscription, quiz results, progress, and bookmarks
- Published courses and lesson previews are readable by all authenticated users
- Admin role can read and write all tables
- Premium lesson columns (`video_url`, `reviewer_pdf_url`) are excluded from the `lesson_previews` view

---

## 5. Setup & Development Guide

### Prerequisites

- Node.js 20 or later
- npm (or pnpm)
- Supabase CLI: `npm install -g supabase`
- Git

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/<your-org>/elearning-review-platform.git
cd elearning-review-platform

# 2. Install dependencies
npm install

# 3. Create your local environment file
cp .env.example .env
# Open .env and fill in the required values (see table below)

# 4. Start the Vite dev server
npm run dev
# App runs at http://localhost:5173
```

### Running with Mock Data (no backend needed)

To develop without Supabase:

```env
VITE_USE_MOCK=true
VITE_AUTH_PROVIDER=mock
```

Uses hardcoded data from `src/features/*/data/` — no network calls required.

### TypeScript Checks

```bash
# Type-check without building
npx tsc --noEmit

# Full production build (includes type check)
npm run build
```

### Local Supabase (optional)

```bash
# Start local Supabase stack (Docker required)
supabase start

# Apply all migrations
supabase db push

# Open Studio
open http://localhost:54323
```

### Environment Variables

#### Frontend (`VITE_` prefix — bundled into browser JS)

| Variable | Example | Required | Notes |
|---|---|---|---|
| `VITE_AUTH_PROVIDER` | `supabase` | Yes | `mock`, `rest`, or `supabase` |
| `VITE_USE_MOCK` | `false` | No | Set `true` to skip all API calls |
| `VITE_API_BASE_URL` | `http://localhost:3000/api/v1` | REST only | Unused in Supabase mode |
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase | Project URL |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_...` | Supabase | Public anon key (safe to expose) |
| `VITE_R2_PUBLIC_URL` | `https://pub-xxx.r2.dev` | Yes | Public CDN URL for thumbnails |
| `VITE_SUBSCRIPTION_BASE_PRICE` | `299` | Yes | Monthly price in PHP |
| `VITE_SUBSCRIPTION_CURRENCY` | `₱` | Yes | Currency symbol |
| `VITE_FREE_VIDEO_PREVIEW_SECONDS` | `30` | Yes | Free tier video preview duration |
| `VITE_FREE_PDF_MAX_PAGES` | `5` | Yes | Free tier PDF page limit |

> ⚠️ **Never put secrets in `VITE_` variables.** Everything with `VITE_` is visible in the browser JS bundle.

#### Supabase Edge Function Secrets (server-side only)

Set once using the Supabase CLI — never stored in `.env`:

```bash
supabase secrets set \
  R2_ACCOUNT_ID=your-account-id \
  R2_ACCESS_KEY_ID=your-access-key \
  R2_SECRET_ACCESS_KEY=your-secret-key \
  R2_BUCKET_NAME=your-bucket-name \
  R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

---

## 6. Deployment Guide

### Platform: Cloudflare Pages

#### Build Settings

| Setting | Value |
|---|---|
| Framework preset | None (manual) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | 20 |

#### SPA Routing

The file `public/_redirects` contains:

```
/*  /index.html  200
```

This is **required** for React Router to handle all routes. Without it, refreshing any page other than `/` returns a 404.

#### Required Cloudflare Environment Variables

Set these in **Cloudflare Pages → Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `VITE_AUTH_PROVIDER` | `supabase` |
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_...` |
| `VITE_R2_PUBLIC_URL` | `https://pub-xxx.r2.dev` |
| `VITE_SUBSCRIPTION_BASE_PRICE` | `299` |
| `VITE_SUBSCRIPTION_CURRENCY` | `₱` |
| `VITE_FREE_VIDEO_PREVIEW_SECONDS` | `30` |
| `VITE_FREE_PDF_MAX_PAGES` | `5` |

> Do **not** add `VITE_R2_ACCOUNT_ID`, `VITE_R2_ACCESS_KEY_ID`, or `VITE_R2_SECRET_ACCESS_KEY` here. Those belong only in Supabase secrets.

#### Post-Deployment Checklist

- [ ] Add production URL to **Supabase → Auth → URL Configuration → Site URL**
- [ ] Add production URL to **Supabase → Auth → URL Configuration → Redirect URLs**
- [ ] Add production URL to **Cloudflare R2 → Bucket → CORS policy** allowed origins
- [ ] Confirm Edge Functions are deployed: `supabase functions deploy`
- [ ] Apply pending SQL migrations: `supabase db push`

#### Triggering a Redeployment

Cloudflare Pages auto-deploys on every push to the `main` branch. To redeploy manually: **Cloudflare Dashboard → Pages → your project → Deployments → Retry deployment** on the latest entry.

---

## 7. Conventions & Best Practices

### File Naming

| Type | Convention | Example |
|---|---|---|
| React components | PascalCase | `CourseCard.tsx` |
| Hooks | camelCase with `use` prefix | `useCourses.ts` |
| Services / utilities | camelCase | `courseApi.ts`, `cn.ts` |
| Constants | SCREAMING_SNAKE_CASE | `ROUTES`, `NAV_ITEMS` |
| Type files | `types.ts` colocated in feature | `features/courses/types.ts` |

### TypeScript

- Use `interface` for object shapes; use `type` for unions and aliases
- Types are colocated in each feature's `types.ts` — not in a global `types/` folder
- Strict mode is enabled (`noUnusedLocals`, `noUnusedParameters`) — all declared variables must be used

### Route Constants

Always use `ROUTES` from `src/constants/routes.ts` — never hardcode path strings:

```ts
// ✅ Correct
navigate(ROUTES.LESSON(lesson.id))
<Link to={ROUTES.ADMIN_COURSES}>

// ❌ Incorrect
navigate(`/lesson/${lesson.id}`)
<Link to="/admin/courses">
```

### Tailwind CSS

- Use the `cn()` utility (clsx + tailwind-merge) for conditional class merging:
  ```tsx
  className={cn('base-class', isActive && 'active-class')}
  ```
- Prefer canonical Tailwind classes over arbitrary values:
  ```
  w-15   ✅      w-[60px]   ❌ (unless no canonical equivalent exists)
  ```
- No CSS modules or styled-components — Tailwind utilities only

### Error Handling

- `ApiError` wraps all HTTP errors with typed helpers: `.isUnauthorized`, `.isForbidden`, `.isNotFound`
- Supabase errors: always destructure `{ data, error }` and check `error` before using `data`
- User-facing errors displayed via `ErrorMessage` component or Sonner toast notifications

### Adding a New Feature

1. Create `src/features/<name>/` with: `components/`, `hooks/`, `services/`, `types.ts`
2. Define types in `types.ts`
3. Add Supabase queries in `<name>.service.ts`
4. Create a router file `<name>Api.ts` (mock / supabase / rest switch)
5. Create a Zustand store if global state is needed
6. Add page(s) to `src/pages/`
7. Register route(s) in `src/app/router.tsx`
8. Add route constants to `src/constants/routes.ts`

### Adding a New Admin Page

1. Create `src/pages/admin/AdminXxxPage.tsx`
2. Add CRUD functions to `src/services/admin.service.ts`
3. Add a modal to `src/features/admin/components/XxxModal.tsx`
4. Register route under `ProtectedAdminRoute` in `router.tsx`
5. Add nav entry to `NAV_ITEMS` in `src/features/admin/components/AdminLayout.tsx`
6. Add route label to `ROUTE_LABELS` in the same file

### Reusable Components

| Component | Location | Use for |
|---|---|---|
| `Button` | `components/ui/button.tsx` | All clickable buttons with variant support |
| `Input` | `components/ui/input.tsx` | Text inputs with validation state |
| `Badge` | `components/ui/badge.tsx` | Small status or category pills |
| `Skeleton` | `components/ui/skeleton.tsx` | Loading placeholders |
| `ErrorMessage` | `components/ui/ErrorMessage.tsx` | Inline form error display |
| `AdminTable` | `features/admin/components/AdminTable.tsx` | Tabular data in admin pages |
| `StatCard` | `features/admin/components/StatCard.tsx` | Admin dashboard metric cards |
| `MathText` | `components/MathText.tsx` | LaTeX math rendering in questions |
| `ContentWatermark` | `components/ContentWatermark.tsx` | Overlay on video/PDF content |
| `CourseThumbnail` | `components/CourseThumbnail.tsx` | Course image with gradient fallback |

---

# PART 2 — END-USER GUIDE

---

## 8. User Manual

> This guide is written for non-technical users. No programming knowledge is required.

---

### 8.1 Getting Started

#### How to Create an Account

1. Open the platform website in your browser
2. Click **Register** in the top navigation bar
3. Fill in the form:
   - **First Name** and **Last Name**
   - **Email Address** — you will use this to log in
   - **Mobile Number**
   - **Password** — must be at least 8 characters
4. Click **Register**
5. If email confirmation is required, check your inbox and click the verification link before logging in

#### How to Log In

1. Click **Login** in the top navigation bar
2. Enter your **Email Address** and **Password**
3. Click **Login**
4. You will be taken to your **Dashboard**

#### How to Log Out

1. Click your name or avatar in the top-right corner of the navigation bar
2. Click **Logout**
3. A confirmation dialog will appear — click **Confirm** to log out

---

### 8.2 Navigation Overview

After logging in, you will see the top navigation bar with the following links:

| Link | What it does |
|---|---|
| **Home** | Returns to the landing page |
| **Courses** | Browse all available courses |
| **Dashboard** | View your saved courses and progress |
| **Subscription** | View plans and subscribe |
| **Admin** *(admin users only)* | Open the admin management panel |

---

### 8.3 Browsing Courses

#### Finding a Course

1. Click **Courses** in the navigation bar
2. You will see a grid of all published courses
3. Use the **search bar** at the top to find courses by name or topic
4. Use the **filter options** to narrow results:
   - **Category** — filter by subject area
   - **Duration** — short / medium / long
   - **Difficulty** — beginner / intermediate / advanced
5. Use the **Sort** dropdown to reorder results (most relevant, newest, A–Z, most lessons)

#### Saving a Course

1. Open a course card or course detail page
2. Click the **bookmark icon** (or **Save** button)
3. The course will appear in your **Dashboard** under "Saved Courses"
4. To unsave, click the bookmark icon again

---

### 8.4 Viewing a Course

1. Click on any course card to open the **Course Detail Page**
2. You will see:
   - Course title, description, and category
   - List of all lessons in order
   - Duration and difficulty level
3. Click on any lesson to open it

---

### 8.5 Taking a Lesson

The **Lesson Page** has up to four sections:

#### Video Tab
- The lesson video plays in a built-in player
- **Free users:** Only the first 30 seconds play — an upgrade prompt appears after
- **Subscribed users:** Full video is accessible

#### PDF / Reviewer Tab
- A PDF study guide is displayed in a page viewer
- **Free users:** Only the first 5 pages are shown — an upgrade prompt appears after
- **Subscribed users:** All pages are accessible

#### Quiz Tab
- Multiple-choice questions for the current lesson
- Select one answer per question, then click **Submit**
- Your score is shown after submission
- **Subscribed users:** The correct answers are revealed after submission
- **Free users:** Scores are shown, but correct answers remain hidden

#### Navigation
- Use **Previous** and **Next** buttons at the bottom to move between lessons
- The sidebar on the left (or top on mobile) shows all lessons in the course with your progress

---

### 8.6 Managing Your Subscription

#### Viewing Plans

1. Click **Subscription** in the navigation bar
2. You will see three plan options:

| Plan | Duration | Price | Savings |
|---|---|---|---|
| Monthly | 1 month | ₱299/month | — |
| Quarterly | 3 months | ~₱269/month | 10% off |
| Semi-Annual | 6 months | ~₱239/month | 20% off |

#### Subscribing

1. Select your preferred plan duration
2. Click **Subscribe**
3. Complete the payment process *(PayMongo integration — GCash, Maya, or card)*
4. After payment, your account is immediately upgraded to **Standard** tier
5. You can now access full videos, all PDF pages, and answer reviews

#### Subscription Renewal / Extension

- If your subscription is still active and you purchase again, the new months are **added on top** of your current expiry date (no days are lost)
- If your subscription has expired, a new subscription starts from the current date

#### Checking Your Subscription Status

- Go to **Dashboard** — your subscription tier and expiry date are shown at the top
- Or go to **Subscription** page to see plan details and remaining days

---

### 8.7 Dashboard

Your dashboard shows:

| Section | What you see |
|---|---|
| **Stats cards** | Total courses saved, lessons completed, quizzes taken |
| **Saved Courses** | All courses you bookmarked, with progress bars |

#### Progress Tracking

- Each saved course shows a progress bar indicating how many lessons you have completed
- A lesson is marked complete when you finish watching/viewing it
- Quizzes count toward your total quiz stat

---

### 8.8 Admin Panel (Admin Users Only)

The admin panel is only accessible to users with the **Admin** role. Regular learners cannot access this area.

#### Accessing the Admin Panel

1. Log in with an admin account
2. Click **Admin** in the top navigation bar (only visible to admins)
3. You will be taken to the **Admin Dashboard**

---

#### Admin Dashboard

Shows platform-wide statistics:
- Total courses (published vs. all)
- Total lessons
- Total registered users
- Active subscriptions

---

#### Managing Courses

1. Click **Courses** in the admin sidebar
2. You will see a table of all courses (published and unpublished)

**To create a course:**
1. Click **+ Add Course**
2. Fill in:
   - **Title** — course name
   - **Description** — what the course covers
   - **Category** — select from existing categories
   - **Difficulty** — beginner / intermediate / advanced
   - **Duration** — estimated time (e.g. "4h 30m")
   - **Thumbnail** — upload an image or use a default gradient
   - **Published** — toggle on to make it visible to learners
3. Click **Save**

**To edit a course:**
1. Click the **edit icon** (pencil) next to the course row
2. Modify any field
3. Click **Save**

**To delete a course:**
1. Click the **delete icon** (trash) next to the course row
2. Confirm the deletion

> ⚠️ Deleting a course also removes all its lessons and quizzes. This cannot be undone.

---

#### Managing Lessons

1. Click **Lessons** in the admin sidebar
2. You will see a table of all lessons across all courses

**To add a lesson:**
1. Click **+ Add Lesson**
2. Fill in:
   - **Course** — select the course this lesson belongs to
   - **Title** — lesson name
   - **Description** — brief summary
   - **Order** — position within the course (e.g. `1`, `2`, `3`)
   - **Duration** — human-readable (e.g. "45 mins")
   - **Duration (minutes)** — numeric value for progress calculations
   - **Video file** — upload an MP4 video (max 2 GB)
   - **PDF file** — upload a reviewer PDF (max 50 MB, optional)
3. Click **Save**

**File upload notes:**
- Videos and PDFs are uploaded directly to Cloudflare R2 storage
- Large files may take time to upload — do not close the browser during upload
- After upload, the file URL is saved to the lesson automatically

**To edit a lesson:**
1. Click the edit icon next to the lesson
2. Modify fields or re-upload files
3. Click **Save**

**To delete a lesson:**
1. Click the delete icon
2. Confirm deletion

---

#### Managing Quizzes

1. Click **Quizzes** in the admin sidebar
2. You will see all quiz questions across all lessons

**To add a quiz question:**
1. Click **+ Add Quiz**
2. Fill in:
   - **Lesson** — which lesson this question belongs to
   - **Question** — the question text (supports math notation via KaTeX)
   - **Choices** — add at least 2 answer options
   - **Correct Answer** — select which choice is correct
   - **Order** — position in the quiz sequence
3. Click **Save**

**To edit or delete a question:**
- Use the edit (pencil) or delete (trash) icons in the quiz table row

---

#### Managing Categories

1. Click **Categories** in the admin sidebar

**To add a category:**
1. Click **+ Add Category**
2. Fill in **Name** and optionally **Description**
3. A URL-friendly slug is auto-generated from the name
4. Click **Save**

**To delete a category:**
- Deleting a category does not delete courses in it — their category reference is cleared

---

#### Managing Users

1. Click **Users** in the admin sidebar
2. You will see a table of all registered users with their name, email, role, and registration date

**To change a user's role:**
1. Click the edit icon next to a user
2. Change the **Role** dropdown to `admin` or `user`
3. Click **Save**

> ⚠️ Only assign the admin role to trusted team members. Admins can delete any content and manage all users.

---

#### Managing Subscriptions

1. Click **Subscriptions** in the admin sidebar
2. View a table of all subscriptions: user, tier, status, start date, expiry date
3. This page is currently **read-only** — subscriptions are created through the subscription purchase flow

---

### 8.9 Common Workflows

#### Workflow: Publishing a New Course

1. **Create categories** if needed (Admin → Categories → + Add)
2. **Create the course** (Admin → Courses → + Add Course) — save as unpublished first
3. **Add lessons** (Admin → Lessons → + Add Lesson), selecting the new course
4. **Add quiz questions** for each lesson (Admin → Quizzes → + Add Quiz)
5. **Publish the course** (Admin → Courses → edit → toggle Published → Save)

#### Workflow: A Learner's First Session

1. Register → verify email → log in
2. Browse courses (Courses page)
3. Save a course (bookmark icon)
4. Open a lesson → watch video preview
5. Try the quiz
6. Decide to subscribe for full access (Subscription page)
7. Return to lesson — full video and PDF now unlocked

---

### 8.10 Do's and Don'ts

**Do's:**
- ✅ Keep your login credentials secure — do not share your account
- ✅ Check your email for a verification link after registering
- ✅ Use a stable internet connection when watching videos
- ✅ Complete lessons in order for the best learning experience
- ✅ Submit quizzes to track your progress and unlock answer reviews (Standard tier)
- ✅ Admins: set course order numbers carefully to ensure lessons appear correctly

**Don'ts:**
- ❌ Do not close the browser while a file is uploading — the upload will fail
- ❌ Do not delete a course unless you are certain — it removes all lessons and quizzes
- ❌ Do not assign the admin role to a user unless they are a trusted team member
- ❌ Do not share signed content URLs — they expire in 60 seconds and are tied to your session

---

### 8.11 Common Errors & How to Resolve Them

| Error / Symptom | Likely Cause | What to Do |
|---|---|---|
| "Invalid login credentials" | Wrong email or password | Double-check your email and password. Use the correct case. |
| "Please verify your email" | Email not confirmed | Check your inbox (and spam folder) for the verification email. |
| Video stops at 30 seconds | Free tier limit | Subscribe on the Subscription page to unlock full video. |
| PDF shows only 5 pages | Free tier limit | Subscribe to access the full document. |
| Course page shows nothing | Course not published yet | Contact your admin — the course may still be in draft. |
| File upload fails | File too large or internet issue | Check file size limits (video: 2 GB, PDF: 50 MB). Try on a faster connection. |
| Page shows blank after refresh | Browser issue | Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac). |
| Admin link not visible | Not an admin account | Ask your platform administrator to grant you admin access. |
| Subscription not reflecting | Sync delay | Refresh the page. If it persists, log out and log back in. |

---

# Potential Improvements

The following gaps or improvements were identified during codebase analysis. These are not bugs but architectural opportunities:

| Area | Observation | Suggested Improvement |
|---|---|---|
| **Payment integration** | Subscription purchase flow is not yet connected to a payment gateway | Integrate PayMongo (already planned) — redirect to PayMongo checkout, handle webhook to trigger the `subscribe` edge function |
| **Quiz results persistence** | `quiz.service.saveQuizResult()` exists but it is unclear if all quiz submissions are reliably saved to Supabase | Audit `QuizComponent` to ensure `saveQuizResult` is always called after `submitQuiz()` |
| **Reviewer content** | `reviewerService.ts` returns a stub; reviewer content is not yet stored in Supabase | Add a `reviewer_contents` table and populate `getReviewerContent()` from the DB instead of mock data |
| **Email confirmation UX** | When `confirmationPending = true`, the UI shows a message but there is no resend option | Add a "Resend verification email" button using `supabase.auth.resend()` |
| **TypeScript deprecation** | `baseUrl` in `tsconfig.app.json` is deprecated in TypeScript 7.0 | Migrate to `paths` configuration before upgrading TypeScript |
| **Lesson order management** | Admins set lesson order via a manual number input — gaps or duplicates can occur | Add drag-and-drop reordering or auto-increment logic in the admin lesson form |
| **Subscription admin controls** | The subscriptions page is read-only; admins cannot grant or revoke subscriptions manually | Add admin ability to manually create/expire subscriptions |
| **Password reset** | No password reset / forgot password flow is visible in the codebase | Implement `supabase.auth.resetPasswordForEmail()` with a dedicated reset page |
| **Quiz randomization** | The `randomize` field exists in the Quiz type and schema but the UI does not expose it | Wire up the `randomize` toggle in `QuizModal.tsx` |

---

*This documentation is based entirely on the existing codebase as of April 2026. Any features listed under "Potential Improvements" are not yet implemented.*
