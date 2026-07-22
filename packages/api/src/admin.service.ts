/**
 * admin.service.ts
 *
 * All Supabase queries for the admin panel.
 * Each function requires the caller to be authenticated with role='admin'.
 * Supabase RLS enforces this server-side; the client is the admin's JWT.
 *
 * Never import this file in non-admin components.
 */

import { supabase } from './supabaseClient'
import { ApiError } from './ApiError'
import {
  normalizeBookCoverDisplayUrl,
  normalizeBookCoverStorageKey,
} from './bookCoverUrl'
import { normalizeBookTitle } from './bookContent'
import { normalizePublicAssetDisplayUrl } from './publicAssetUrl'
import {
  HOME_HERO_DB_KEYS,
  HOME_HERO_SECTION,
  homeHeroContentToRows,
  mergeHomeHeroRows,
  type SiteContentHeroRow,
} from './homeHeroContent'
import {
  CONTACT_PAGE_DB_KEYS,
  CONTACT_PAGE_SECTION,
  contactPageContentToRows,
  mergeContactPageRows,
  type SiteContentContactPageRow,
} from './contactPageContent'
import {
  WHO_WE_ARE_PAGE_DB_KEYS,
  WHO_WE_ARE_PAGE_SECTION,
  mergeWhoWeArePageRows,
  whoWeArePageContentToRows,
  type SiteContentWhoWeArePageRow,
} from './whoWeArePageContent'
import {
  LANDING_CONTACT_CTA_DB_KEYS,
  LANDING_CONTACT_CTA_SECTION,
  landingContactCtaContentToRows,
  mergeLandingContactCtaRows,
  type SiteContentContactCtaRow,
} from './contactCtaContent'
import {
  FAQ_PAGE_DB_KEYS,
  FAQ_PAGE_SECTION,
  faqPageContentToRows,
  mergeFaqPageRows,
  type SiteContentFaqPageRow,
} from './faqContent'
import {
  REVIEW_CLASSES_DB_KEYS,
  REVIEW_CLASSES_SECTION,
  mergeReviewClassesRows,
  reviewClassesContentToRows,
  type SiteContentReviewClassesRow,
} from './reviewClassesContent'
import {
  TESTIMONIALS_DB_KEYS,
  TESTIMONIALS_SECTION,
  mergeTestimonialsRows,
  testimonialsContentToRows,
  type SiteContentTestimonialsRow,
} from './testimonialsContent'
import type { BookOrder, OrderStatus, ShippingAddress } from '@s-class/types/books'
import type {
  ContactPageContent,
  FaqPageContent,
  HomeHeroContent,
  LandingContactCtaContent,
  WhoWeArePageContent,
  WhoWeArePageSection,
} from '@s-class/types/home'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalCourses: number
  publishedCourses: number
  totalLessons: number
  totalUsers: number
  activeSubscriptions: number
  /** Distinct students who have marked at least one lesson as watched. */
  studentsCompletedLesson: number
  /** Total number of lesson completions across all users. */
  totalLessonsCompleted: number
}

export interface AdminSubject {
  id: string
  title: string
  description: string
  /** Legacy denormalized text — parent-Course name. Kept until plan §8a cleanup. */
  category: string
  /** UUID of the parent Course. */
  courseId: string | null
  duration: string
  isPublished: boolean
  lessonCount: number
  thumbnailUrl: string | null
  createdAt: string
  sortOrder: number
}

export interface SubjectFormData {
  title: string
  description: string
  courseId?: string | null
  sortOrder: number
}

export interface AdminLesson {
  id: string
  courseId: string
  courseTitle: string
  title: string
  order: number
  /** Curriculum week (1-based). Null until backfill runs or admin sets it. */
  weekNumber: number | null
  /** Curriculum day (1-based, sequential within course). */
  dayNumber: number | null
  /** When TRUE, the lesson is a free preview — guests and free-tier users
   *  can watch it without a subscription. Authoritative on `lessons.is_free_preview`. */
  isFreePreview: boolean
  durationMinutes: number | null
  videoUrl: string | null
  reviewerPdfUrl: string | null
  createdAt: string
}

// ── Quiz types ────────────────────────────────────────────────────────────────

export interface AdminQuizOption {
  text: string
  imageUrl: string | null
}

export interface AdminQuizQuestion {
  id: string
  quizId: string
  questionText: string
  questionImageUrl: string | null
  options: AdminQuizOption[]
  correctAnswer: number
  order: number
  answerText: string | null
  answerImageUrl: string | null
}

export interface AdminProblemSetCategory {
  id: string
  name: string
  sortOrder: number
  problemSetCount: number
  createdAt: string
  updatedAt: string
}

export interface AdminQuiz {
  id: string
  lessonId: string
  title: string
  categoryId: string
  categoryName: string
  categorySortOrder: number
  lessonTitle: string
  courseTitle: string
  description: string | null
  randomize: boolean
  sortOrder: number
  status: 'draft' | 'published'
  questionCount: number
  createdAt: string
}

export interface AdminQuizFull extends AdminQuiz {
  questions: AdminQuizQuestion[]
}

export interface AdminScoringBand {
  id: string
  minScore: number
  maxScore: number
  classLabel: string
  description: string
  sortOrder: number
  createdAt: string
}

export interface AdminScoringTemplate {
  id: string
  lessonId: string
  lessonTitle: string
  courseTitle: string
  title: string
  maxScore: number
  bands: AdminScoringBand[]
  createdAt: string
  updatedAt: string
}

export interface AdminScoringBandInput {
  minScore: number
  maxScore: number
  classLabel: string
  description: string
  sortOrder?: number
}

export interface AdminScoringTemplateInput {
  templateId?: string | null
  lessonId: string
  title: string
  maxScore: number
  bands: AdminScoringBandInput[]
}

export interface LessonFormData {
  courseId: string
  title: string
  order: number
  weekNumber?: number | null
  dayNumber?: number | null
  isFreePreview?: boolean
  durationMinutes?: number | null
}

export interface SubjectOption {
  id: string
  title: string
}

export type AdminSubscriptionEffectiveStatus = 'active' | 'expired' | 'inactive'
export type AdminSubscriptionManualDuration = 1 | 3 | 6

interface SubscriptionEntitlementFields {
  isActive: boolean
  expiresAt: string | null
}

export function getAdminSubscriptionEffectiveStatus(
  subscription: SubscriptionEntitlementFields,
  now: Date = new Date(),
): AdminSubscriptionEffectiveStatus {
  if (subscription.expiresAt) {
    const expiresAt = new Date(subscription.expiresAt)
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
      return 'expired'
    }
  }

  return subscription.isActive ? 'active' : 'inactive'
}

export function isAdminSubscriptionEntitled(
  subscription: SubscriptionEntitlementFields,
  now: Date = new Date(),
): boolean {
  return getAdminSubscriptionEffectiveStatus(subscription, now) === 'active'
}

export interface AdminSubscription {
  id: string
  userId: string
  userName: string | null
  planId: string
  tier: string | null
  isActive: boolean
  effectiveStatus: AdminSubscriptionEffectiveStatus
  isEntitled: boolean
  startedAt: string
  expiresAt: string | null
  durationMonths: number | null
  createdAt: string
}

type AdminSubscriptionAccessAction =
  | 'disable_access'
  | 'restore_access'
  | 'renew'
  | 'extend'
  | 'set_custom_expiry'

interface AdminSubscriptionAccessResponse {
  subscription: {
    id: string
    userId: string
    isActive: boolean
    expiresAt: string | null
    tier: string | null
    durationMonths: number | null
  }
}

interface AdminSubscriptionAccessRequest {
  action: AdminSubscriptionAccessAction
  userId: string
  reason?: string
  durationMonths?: AdminSubscriptionManualDuration
  expiresAt?: string
}

export interface AdminUser {
  id: string
  name: string
  firstName: string
  lastName: string
  email: string | null
  mobileNumber: string
  school: string
  schoolId: string
  role: 'user' | 'admin'
  isSubscribed: boolean
  subscriptionExpiresAt: string | null
  createdAt: string
}

export type AdminDeviceResetKind = 'desktop' | 'mobile' | 'all'

interface AdminDeviceResetResponse {
  status: 'ok'
  deviceKind: AdminDeviceResetKind
  resetCount: number
}

// ── Raw DB shapes ─────────────────────────────────────────────────────────────
//
// Internal row interfaces match the renamed columns from the Phase 1 migration
// (course_id, subject_id).

interface CourseRef {
  id: string
  name: string
}

interface SubjectRow {
  id: string
  title: string
  description: string
  /** Legacy denormalized field — kept until plan §8a cleanup. */
  category: string
  course_id: string | null
  /** Joined from courses table via course_id FK. */
  course: CourseRef | null
  duration: string
  is_published: boolean
  thumbnail_url: string | null
  created_at: string
  sort_order: number
  lessons: { count: number }[]
}

// ── Raw quiz DB shapes ────────────────────────────────────────────────────────

interface QuizRow {
  id: string
  lesson_id: string
  title: string | null
  category_id: string
  category: { id: string; name: string; sort_order: number | null } | null
  description: string | null
  randomize_questions: boolean
  sort_order: number | null
  status: 'draft' | 'published' | null
  created_at: string
  lessons: { title: string; subjects: { title: string } | null } | null
  quiz_questions: { count: number }[]
}

interface ProblemSetCategoryRow {
  id: string
  name: string
  sort_order: number | null
  created_at: string
  updated_at: string
  quizzes: { count: number }[]
}

interface QuizQuestionRow {
  id: string
  quiz_id: string
  question_text: string
  question_image_url: string | null
  options: { text: string; image_url: string | null }[]
  correct_answer: number
  order: number
  answer_text: string | null
  answer_image_url: string | null
}

interface LessonScoringBandRow {
  id: string
  template_id: string
  min_score: number
  max_score: number
  class_label: string
  description: string | null
  sort_order: number | null
  created_at: string
}

interface LessonScoringTemplateRow {
  id: string
  lesson_id: string
  title: string
  max_score: number
  created_at: string
  updated_at: string
  lessons: { title: string; subjects: { title: string } | null } | null
  bands: LessonScoringBandRow[]
}

interface LessonRow {
  id: string
  subject_id: string
  title: string
  order: number
  week_number: number | null
  day_number: number | null
  is_free_preview: boolean | null
  duration_minutes: number | null
  video_url: string | null
  reviewer_pdf_url: string | null
  created_at: string
  subjects: { title: string } | null
}

interface UserListRow {
  id: string
  name: string
  email: string | null
  first_name: string | null
  last_name: string | null
  mobile_number: string | null
  school: string | null
  school_id: string | null
  role: string
  is_subscribed: boolean
  subscription_expires_at: string | null
  created_at: string
}

interface SubscriptionRow {
  id: string
  user_id: string
  plan_id: string
  tier: string | null
  is_active: boolean
  started_at: string
  expires_at: string | null
  duration_months: number | null
  created_at: string
}

function normalizeQuizMediaUrl(value?: string | null): string | null {
  if (!value?.trim()) return null
  return normalizePublicAssetDisplayUrl(value) ?? value.trim()
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats> {
  const nowIso = new Date().toISOString()
  const [coursesRes, lessonsRes, usersRes, subsRes, completionsRes, completionsCountRes] = await Promise.all([
    // Note: `coursesRes` here counts SUBJECTS, not parent Courses. The variable
    // name matches the still-unchanged AdminStats.totalCourses field, which
    // Phase 3 of the domain refactor will rename to totalSubjects.
    supabase.from('subjects').select('is_published', { count: 'exact', head: false }),
    supabase.from('lessons').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
    supabase
      .from('lesson_progress')
      .select('user_id')
      .eq('is_watched', true),
    supabase
      .from('lesson_progress')
      .select('id', { count: 'exact', head: true })
      .eq('is_watched', true),
  ])

  if (coursesRes.error)          throw new ApiError(500, 'ADMIN_STATS_FAILED', coursesRes.error.message)
  if (lessonsRes.error)          throw new ApiError(500, 'ADMIN_STATS_FAILED', lessonsRes.error.message)
  if (usersRes.error)            throw new ApiError(500, 'ADMIN_STATS_FAILED', usersRes.error.message)
  if (subsRes.error)             throw new ApiError(500, 'ADMIN_STATS_FAILED', subsRes.error.message)
  if (completionsRes.error)      throw new ApiError(500, 'ADMIN_STATS_FAILED', completionsRes.error.message)
  if (completionsCountRes.error) throw new ApiError(500, 'ADMIN_STATS_FAILED', completionsCountRes.error.message)

  const courses = coursesRes.data as { is_published: boolean }[]
  const completionRows = (completionsRes.data ?? []) as { user_id: string }[]
  const distinctStudents = new Set(completionRows.map((r) => r.user_id)).size

  return {
    totalCourses:            courses.length,
    publishedCourses:        courses.filter((c) => c.is_published).length,
    totalLessons:            lessonsRes.count ?? 0,
    totalUsers:              usersRes.count   ?? 0,
    activeSubscriptions:     subsRes.count    ?? 0,
    studentsCompletedLesson: distinctStudents,
    totalLessonsCompleted:   completionsCountRes.count ?? 0,
  }
}

// ── Subjects ──────────────────────────────────────────────────────────────────

export async function getAdminSubjects(): Promise<AdminSubject[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('id, title, description, category, course_id, duration, is_published, thumbnail_url, created_at, sort_order, lessons:lessons(count), course:courses(id,name)')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw new ApiError(500, 'ADMIN_SUBJECTS_FAILED', error.message)

  return (data as unknown as SubjectRow[]).map((row) => ({
    id:           row.id,
    title:        row.title,
    description:  row.description ?? '',
    // Prefer joined parent-Course name; fall back to legacy text column
    category:     row.course?.name ?? row.category ?? '',
    courseId:     row.course_id ?? null,
    duration:     row.duration,
    isPublished:  row.is_published,
    lessonCount:  row.lessons[0]?.count ?? 0,
    thumbnailUrl: row.thumbnail_url,
    createdAt:    row.created_at,
    sortOrder:    row.sort_order,
  }))
}

export async function createSubject(data: SubjectFormData): Promise<string> {
  const { data: row, error } = await supabase
    .from('subjects')
    .insert({
      title:        data.title,
      description:  data.description,
      category:     '',
      course_id:    data.courseId ?? null,
      duration:     '',
      is_published: false,
      sort_order:   data.sortOrder,
    })
    .select('id')
    .single()

  if (error) throw new ApiError(500, 'ADMIN_SUBJECT_CREATE_FAILED', error.message)
  return (row as { id: string }).id
}

export async function updateSubject(
  subjectId: string,
  data: Partial<SubjectFormData & { thumbnailUrl: string }>,
): Promise<void> {
  const update: Record<string, unknown> = {}
  if (data.title        !== undefined) update.title         = data.title
  if (data.description  !== undefined) update.description   = data.description
  if (data.thumbnailUrl !== undefined) update.thumbnail_url = data.thumbnailUrl
  if (data.sortOrder    !== undefined) update.sort_order    = data.sortOrder
  if ('courseId' in data)              update.course_id     = data.courseId ?? null

  const { error } = await supabase
    .from('subjects')
    .update(update)
    .eq('id', subjectId)

  if (error) throw new ApiError(500, 'ADMIN_SUBJECT_UPDATE_FAILED', error.message)
}

export async function setSubjectPublished(subjectId: string, isPublished: boolean): Promise<void> {
  const { error } = await supabase
    .from('subjects')
    .update({ is_published: isPublished })
    .eq('id', subjectId)

  if (error) throw new ApiError(500, 'ADMIN_SUBJECT_UPDATE_FAILED', error.message)
}

export async function deleteSubject(subjectId: string): Promise<void> {
  const { error } = await supabase
    .from('subjects')
    .delete()
    .eq('id', subjectId)

  if (error) throw new ApiError(500, 'ADMIN_SUBJECT_DELETE_FAILED', error.message)
}

// ── Lessons ───────────────────────────────────────────────────────────────────

export async function getAdminLessons(): Promise<AdminLesson[]> {
  const { data, error } = await supabase
    .from('lessons')
    .select('id, subject_id, title, order, week_number, day_number, is_free_preview, duration_minutes, video_url, reviewer_pdf_url, created_at, subjects(title)')
    .order('subject_id')
    .order('order', { ascending: true })

  if (error) throw new ApiError(500, 'ADMIN_LESSONS_FAILED', error.message)

  return (data as unknown as LessonRow[]).map((row) => ({
    id:              row.id,
    // AdminLesson.courseId / courseTitle field names are kept until a
    // future cleanup; the values point at the parent SUBJECT.
    courseId:        row.subject_id,
    courseTitle:     row.subjects?.title ?? 'Unknown',
    title:           row.title,
    order:           row.order,
    weekNumber:      row.week_number ?? null,
    dayNumber:       row.day_number  ?? null,
    isFreePreview:   row.is_free_preview === true,
    durationMinutes: row.duration_minutes ?? null,
    videoUrl:        row.video_url,
    reviewerPdfUrl:  row.reviewer_pdf_url,
    createdAt:       row.created_at,
  }))
}

export async function getSubjectsForSelect(): Promise<SubjectOption[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('id, title')
    .order('sort_order', { ascending: true })
    .order('title')

  if (error) throw new ApiError(500, 'ADMIN_SUBJECTS_FAILED', error.message)
  return data as SubjectOption[]
}

/** Returns the highest `order` value among lessons in a subject, or 0 if none. */
export async function getMaxLessonOrderInSubject(subjectId: string): Promise<number> {
  const { data, error } = await supabase
    .from('lessons')
    .select('order')
    .eq('subject_id', subjectId)
    .order('order', { ascending: false })
    .limit(1)

  if (error) throw new ApiError(500, 'ADMIN_LESSON_ORDER_FAILED', error.message)
  return (data as { order: number }[] | null)?.[0]?.order ?? 0
}

export async function createAdminLesson(data: LessonFormData): Promise<string> {
  const { data: row, error } = await supabase
    .from('lessons')
    .insert({
      // LessonFormData.courseId still represents the parent subject's id
      // until Phase 3 renames the field.
      subject_id:       data.courseId,
      title:            data.title,
      order:            data.order,
      week_number:      data.weekNumber ?? null,
      day_number:       data.dayNumber  ?? null,
      is_free_preview:  data.isFreePreview ?? false,
      duration_minutes: data.durationMinutes ?? null,
      description:      '',
      duration:         '',
    })
    .select('id')
    .single()

  if (error) throw new ApiError(500, 'ADMIN_LESSON_CREATE_FAILED', error.message)
  return (row as { id: string }).id
}

export async function updateAdminLesson(
  lessonId: string,
  data: Partial<LessonFormData & { videoUrl: string; reviewerPdfUrl: string }>,
): Promise<void> {
  const update: Record<string, unknown> = {}
  if (data.courseId        !== undefined) update.subject_id        = data.courseId
  if (data.title           !== undefined) update.title             = data.title
  if (data.order           !== undefined) update.order             = data.order
  if (data.weekNumber      !== undefined) update.week_number       = data.weekNumber
  if (data.dayNumber       !== undefined) update.day_number        = data.dayNumber
  if (data.isFreePreview   !== undefined) update.is_free_preview   = data.isFreePreview
  if (data.durationMinutes !== undefined) update.duration_minutes  = data.durationMinutes
  if (data.videoUrl        !== undefined) update.video_url         = data.videoUrl
  if (data.reviewerPdfUrl  !== undefined) update.reviewer_pdf_url  = data.reviewerPdfUrl

  const { error } = await supabase
    .from('lessons')
    .update(update)
    .eq('id', lessonId)

  if (error) throw new ApiError(500, 'ADMIN_LESSON_UPDATE_FAILED', error.message)
}

export async function deleteAdminLesson(lessonId: string): Promise<void> {
  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', lessonId)

  if (error) throw new ApiError(500, 'ADMIN_LESSON_DELETE_FAILED', error.message)
}

// ── Problem sets ──────────────────────────────────────────────────────────────

export async function getProblemSetCategories(): Promise<AdminProblemSetCategory[]> {
  const { data, error } = await supabase
    .from('problem_set_categories')
    .select('id, name, sort_order, created_at, updated_at, quizzes(count)')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new ApiError(500, 'ADMIN_PROBLEM_SET_CATEGORIES_FAILED', error.message)

  return (data as unknown as ProblemSetCategoryRow[]).map((row) => ({
    id:              row.id,
    name:            row.name,
    sortOrder:       row.sort_order ?? 0,
    problemSetCount: row.quizzes[0]?.count ?? 0,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
  }))
}

export async function createProblemSetCategory({
  name,
  sortOrder,
}: {
  name: string
  sortOrder: number
}): Promise<string> {
  const { data, error } = await supabase
    .from('problem_set_categories')
    .insert({
      name:       name.trim(),
      sort_order: sortOrder,
    })
    .select('id')
    .single()

  if (error) throw new ApiError(500, 'ADMIN_PROBLEM_SET_CATEGORY_CREATE_FAILED', error.message)
  return (data as { id: string }).id
}

export async function updateProblemSetCategory(
  categoryId: string,
  {
    name,
    sortOrder,
  }: {
    name: string
    sortOrder: number
  },
): Promise<void> {
  const { error } = await supabase
    .from('problem_set_categories')
    .update({
      name:       name.trim(),
      sort_order: sortOrder,
    })
    .eq('id', categoryId)

  if (error) throw new ApiError(500, 'ADMIN_PROBLEM_SET_CATEGORY_UPDATE_FAILED', error.message)
}

export async function deleteProblemSetCategory(categoryId: string): Promise<void> {
  const { error } = await supabase
    .from('problem_set_categories')
    .delete()
    .eq('id', categoryId)

  if (!error) return

  const isInUse =
    error.code === '23503'
    || /foreign key|still referenced|violates/i.test(error.message)

  throw new ApiError(
    isInUse ? 409 : 500,
    isInUse ? 'ADMIN_PROBLEM_SET_CATEGORY_IN_USE' : 'ADMIN_PROBLEM_SET_CATEGORY_DELETE_FAILED',
    isInUse
      ? 'This category is used by one or more problem sets. Move or delete those problem sets first.'
      : error.message,
  )
}

export async function getAdminQuizzes(): Promise<AdminQuiz[]> {
  const { data, error } = await supabase
    .from('quizzes')
    .select('id, lesson_id, title, category_id, category:problem_set_categories(id, name, sort_order), description, randomize_questions, sort_order, status, created_at, lessons(title, subjects(title)), quiz_questions(count)')
    .order('lesson_id', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw new ApiError(500, 'ADMIN_QUIZZES_FAILED', error.message)

  return (data as unknown as QuizRow[]).map((row) => ({
    id:            row.id,
    lessonId:      row.lesson_id,
    title:         row.title?.trim() || 'Elements',
    categoryId:    row.category?.id ?? row.category_id,
    categoryName:  row.category?.name?.trim() || 'Elements',
    categorySortOrder: row.category?.sort_order ?? 40,
    lessonTitle:   row.lessons?.title ?? 'Unknown lesson',
    // AdminQuiz.courseTitle field name kept until Phase 3; value is the
    // parent subject's title.
    courseTitle:   row.lessons?.subjects?.title ?? 'Unknown subject',
    description:   row.description ?? null,
    randomize:     row.randomize_questions ?? false,
    sortOrder:     row.sort_order ?? 0,
    status:        row.status ?? 'published',
    questionCount: row.quiz_questions[0]?.count ?? 0,
    createdAt:     row.created_at,
  })).sort((a, b) =>
    a.lessonTitle.localeCompare(b.lessonTitle)
    || a.categorySortOrder - b.categorySortOrder
    || a.categoryName.localeCompare(b.categoryName)
    || a.sortOrder - b.sortOrder
    || a.title.localeCompare(b.title)
  )
}

export async function getAdminQuizFull(quizId: string): Promise<AdminQuizFull | null> {
  const [quizRes, questionsRes] = await Promise.all([
    supabase
      .from('quizzes')
      .select('id, lesson_id, title, category_id, category:problem_set_categories(id, name, sort_order), description, randomize_questions, sort_order, status, created_at, lessons(title, subjects(title))')
      .eq('id', quizId)
      .single(),
    supabase
      .from('quiz_questions')
      .select('id, quiz_id, question_text, question_image_url, options, correct_answer, order, answer_text, answer_image_url')
      .eq('quiz_id', quizId)
      .order('order', { ascending: true }),
  ])

  if (quizRes.error) throw new ApiError(500, 'ADMIN_QUIZ_FETCH_FAILED', quizRes.error.message)
  if (questionsRes.error) throw new ApiError(500, 'ADMIN_QUIZ_FETCH_FAILED', questionsRes.error.message)
  if (!quizRes.data) return null

  const quiz = quizRes.data as unknown as QuizRow
  const questions = (questionsRes.data as unknown as QuizQuestionRow[]).map((q) => ({
    id:               q.id,
    quizId:           q.quiz_id,
    questionText:     q.question_text ?? '',
    questionImageUrl: normalizeQuizMediaUrl(q.question_image_url),
    options: (q.options ?? []).map((o) => ({ text: o.text ?? '', imageUrl: normalizeQuizMediaUrl(o.image_url) })),
    correctAnswer:    q.correct_answer,
    order:            q.order,
    answerText:       q.answer_text ?? null,
    answerImageUrl:   normalizeQuizMediaUrl(q.answer_image_url),
  }))

  return {
    id:            quiz.id,
    lessonId:      quiz.lesson_id,
    title:         quiz.title?.trim() || 'Elements',
    categoryId:    quiz.category?.id ?? quiz.category_id,
    categoryName:  quiz.category?.name?.trim() || 'Elements',
    categorySortOrder: quiz.category?.sort_order ?? 40,
    lessonTitle:   quiz.lessons?.title ?? 'Unknown lesson',
    courseTitle:   quiz.lessons?.subjects?.title ?? 'Unknown subject',
    description:   quiz.description ?? null,
    randomize:     quiz.randomize_questions ?? false,
    sortOrder:     quiz.sort_order ?? 0,
    status:        quiz.status ?? 'published',
    questionCount: questions.length,
    createdAt:     quiz.created_at,
    questions,
  }
}

export async function createAdminQuiz({
  lessonId,
  title,
  categoryId,
  description,
  randomize,
  sortOrder,
  status,
}: {
  lessonId: string
  title: string
  categoryId: string
  description?: string | null
  randomize?: boolean
  sortOrder?: number
  status?: 'draft' | 'published'
}): Promise<string> {
  const { data, error } = await supabase
    .from('quizzes')
    .insert({
      lesson_id:           lessonId,
      title,
      category_id:         categoryId,
      description:         description ?? null,
      randomize_questions: randomize ?? false,
      sort_order:          sortOrder ?? 0,
      status:              status ?? 'published',
    })
    .select('id')
    .single()

  if (error) throw new ApiError(500, 'ADMIN_QUIZ_CREATE_FAILED', error.message)
  return (data as { id: string }).id
}

export async function updateAdminQuiz(
  quizId: string,
  {
    title,
    categoryId,
    description,
    randomize,
    sortOrder,
    status,
  }: {
    title: string
    categoryId: string
    description: string | null
    randomize: boolean
    sortOrder: number
    status: 'draft' | 'published'
  },
): Promise<void> {
  const { error } = await supabase
    .from('quizzes')
    .update({
      title,
      category_id: categoryId,
      description,
      randomize_questions: randomize,
      sort_order:          sortOrder,
      status,
    })
    .eq('id', quizId)

  if (error) throw new ApiError(500, 'ADMIN_QUIZ_UPDATE_FAILED', error.message)
}

export async function upsertQuizQuestion(params: {
  id: string
  quizId: string
  questionText: string
  questionImageUrl: string | null
  options: AdminQuizOption[]
  correctAnswer: number
  order: number
  answerText: string | null
  answerImageUrl: string | null
}): Promise<void> {
  const { error } = await supabase
    .from('quiz_questions')
    .upsert({
      id:                 params.id,
      quiz_id:            params.quizId,
      question_text:      params.questionText,
      question_image_url: normalizeQuizMediaUrl(params.questionImageUrl),
      options: params.options.map((o) => ({ text: o.text, image_url: normalizeQuizMediaUrl(o.imageUrl) })),
      correct_answer:     params.correctAnswer,
      order:              params.order,
      answer_text:        params.answerText,
      answer_image_url:   normalizeQuizMediaUrl(params.answerImageUrl),
    })

  if (error) throw new ApiError(500, 'ADMIN_QUESTION_UPSERT_FAILED', error.message)
}

export async function deleteQuizQuestions(quizId: string): Promise<void> {
  const { error } = await supabase
    .from('quiz_questions')
    .delete()
    .eq('quiz_id', quizId)

  if (error) throw new ApiError(500, 'ADMIN_QUESTION_DELETE_FAILED', error.message)
}

export async function deleteQuizQuestionsByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase
    .from('quiz_questions')
    .delete()
    .in('id', ids)

  if (error) throw new ApiError(500, 'ADMIN_QUESTION_DELETE_FAILED', error.message)
}

export async function deleteAdminQuiz(quizId: string): Promise<void> {
  const { error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', quizId)

  if (error) throw new ApiError(500, 'ADMIN_QUIZ_DELETE_FAILED', error.message)
}

// ── Lesson scoring templates ─────────────────────────────────────────────────

function mapScoringTemplate(row: LessonScoringTemplateRow): AdminScoringTemplate {
  const bands = [...(row.bands ?? [])]
    .map((band) => ({
      id:          band.id,
      minScore:    band.min_score,
      maxScore:    band.max_score,
      classLabel:  band.class_label,
      description: band.description ?? '',
      sortOrder:   band.sort_order ?? 0,
      createdAt:   band.created_at,
    }))
    .sort((a, b) =>
      a.sortOrder - b.sortOrder
      || b.minScore - a.minScore
      || b.maxScore - a.maxScore
      || a.classLabel.localeCompare(b.classLabel)
    )

  return {
    id:          row.id,
    lessonId:    row.lesson_id,
    lessonTitle: row.lessons?.title ?? 'Unknown lesson',
    // AdminScoringTemplate.courseTitle field name matches the existing admin
    // quiz types; the value is the parent subject title.
    courseTitle: row.lessons?.subjects?.title ?? 'Unknown subject',
    title:       row.title,
    maxScore:    row.max_score,
    bands,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  }
}

function scoringTemplateError(error: { code?: string; message: string }): ApiError {
  if (error.code === '23505') {
    return new ApiError(
      409,
      'ADMIN_SCORING_TEMPLATE_DUPLICATE_LESSON',
      'This lesson already has a scoring template.',
      error,
    )
  }

  if (error.code === '23P01') {
    return new ApiError(
      422,
      'ADMIN_SCORING_TEMPLATE_BANDS_OVERLAP',
      'Grade band score ranges cannot overlap.',
      error,
    )
  }

  if (error.code === '23514') {
    return new ApiError(
      422,
      'ADMIN_SCORING_TEMPLATE_INVALID',
      error.message,
      error,
    )
  }

  if (error.code === '23503') {
    return new ApiError(
      422,
      'ADMIN_SCORING_TEMPLATE_INVALID_LESSON',
      error.message,
      error,
    )
  }

  if (error.code === '42501') {
    return new ApiError(
      403,
      'ADMIN_SCORING_TEMPLATE_FORBIDDEN',
      error.message,
      error,
    )
  }

  if (error.code === 'P0002') {
    return new ApiError(
      404,
      'ADMIN_SCORING_TEMPLATE_NOT_FOUND',
      error.message,
      error,
    )
  }

  return new ApiError(
    500,
    'ADMIN_SCORING_TEMPLATE_SAVE_FAILED',
    error.message,
    error,
  )
}

export async function getAdminScoringTemplates(): Promise<AdminScoringTemplate[]> {
  const { data, error } = await supabase
    .from('lesson_scoring_templates')
    .select(`
      id,
      lesson_id,
      title,
      max_score,
      created_at,
      updated_at,
      lessons(title, subjects(title)),
      bands:lesson_scoring_bands(
        id,
        template_id,
        min_score,
        max_score,
        class_label,
        description,
        sort_order,
        created_at
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw new ApiError(500, 'ADMIN_SCORING_TEMPLATES_FAILED', error.message)

  return (data as unknown as LessonScoringTemplateRow[])
    .map(mapScoringTemplate)
    .sort((a, b) =>
      a.courseTitle.localeCompare(b.courseTitle)
      || a.lessonTitle.localeCompare(b.lessonTitle)
      || a.title.localeCompare(b.title)
    )
}

export async function saveAdminScoringTemplate(input: AdminScoringTemplateInput): Promise<string> {
  const { data, error } = await supabase.rpc('save_lesson_scoring_template', {
    p_template_id: input.templateId ?? null,
    p_lesson_id:   input.lessonId,
    p_title:       input.title,
    p_max_score:   input.maxScore,
    p_bands: input.bands.map((band, index) => ({
      min_score:   band.minScore,
      max_score:   band.maxScore,
      class_label: band.classLabel,
      description: band.description,
      sort_order:  band.sortOrder ?? index + 1,
    })),
  })

  if (error) throw scoringTemplateError(error)
  return data as string
}

export async function deleteAdminScoringTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('lesson_scoring_templates')
    .delete()
    .eq('id', templateId)

  if (error) throw new ApiError(500, 'ADMIN_SCORING_TEMPLATE_DELETE_FAILED', error.message)
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from('admin_user_list')
    .select('id, name, email, first_name, last_name, mobile_number, school, school_id, role, is_subscribed, subscription_expires_at, created_at')
    .order('created_at', { ascending: false })

  if (error) throw new ApiError(500, 'ADMIN_USERS_FAILED', error.message)

  return (data as UserListRow[]).map((row) => ({
    id:                    row.id,
    name:                  row.name,
    firstName:             row.first_name ?? '',
    lastName:              row.last_name ?? '',
    email:                 row.email ?? null,
    mobileNumber:          row.mobile_number ?? '',
    school:                row.school ?? '',
    schoolId:              row.school_id ?? '',
    role:                  row.role as 'user' | 'admin',
    isSubscribed:          row.is_subscribed,
    subscriptionExpiresAt: row.subscription_expires_at,
    createdAt:             row.created_at,
  }))
}

export async function setUserRole(userId: string, role: 'user' | 'admin'): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) throw new ApiError(500, 'ADMIN_USER_ROLE_FAILED', error.message)
}

export async function updateAdminUser(
  userId: string,
  data: {
    name?: string
    firstName?: string
    lastName?: string
    mobileNumber?: string
    school?: string
    schoolId?: string
  },
): Promise<void> {
  const update: Record<string, unknown> = {}
  if (data.firstName    !== undefined) update.first_name    = data.firstName
  if (data.lastName     !== undefined) update.last_name     = data.lastName
  if (data.mobileNumber !== undefined) update.mobile_number = data.mobileNumber
  if (data.school       !== undefined) update.school        = data.school
  if (data.schoolId     !== undefined) update.school_id     = data.schoolId
  if (data.name         !== undefined) update.name          = data.name
  // Derive name from first+last if both provided
  if (data.firstName !== undefined && data.lastName !== undefined) {
    update.name = `${data.firstName} ${data.lastName}`.trim()
  }

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', userId)

  if (error) throw new ApiError(500, 'ADMIN_USER_UPDATE_FAILED', error.message)
}

export async function resetUserDevices(
  userId: string,
  deviceKind: AdminDeviceResetKind = 'all',
): Promise<AdminDeviceResetResponse> {
  const { data, error } = await supabase.functions.invoke<AdminDeviceResetResponse>(
    'admin-devices',
    {
      body: {
        action: 'reset_user_devices',
        userId,
        deviceKind,
      },
    },
  )

  if (error) {
    let status = 500
    let code = 'ADMIN_DEVICE_RESET_FAILED'
    let message = error.message || 'Failed to reset device slots.'

    const context = (error as { context?: unknown }).context
    if (context instanceof Response) {
      status = context.status
      try {
        const payload = await context.clone().json() as { error?: string; code?: string }
        if (payload.error) message = payload.error
        if (payload.code)  code    = payload.code
      } catch {
        // Keep the default function error message.
      }
    }

    throw new ApiError(status, code, message, error)
  }

  if (!data) {
    throw new ApiError(500, 'ADMIN_DEVICE_RESET_FAILED', 'Device reset returned an empty response.')
  }

  return data
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

/**
 * Fetches all subscriptions, merged with user names from the admin_user_list
 * view. Two queries are needed because subscriptions.user_id references
 * auth.users (not profiles), so a direct PostgREST join to profiles is unavailable.
 *
 * Mutations intentionally go through the admin-subscriptions Edge Function.
 * Direct client-side subscription writes are blocked by RLS.
 */
export async function getAdminSubscriptions(): Promise<AdminSubscription[]> {
  const [subsRes, usersRes] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('id, user_id, plan_id, tier, is_active, started_at, expires_at, duration_months, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('admin_user_list')
      .select('id, name'),
  ])

  if (subsRes.error)  throw new ApiError(500, 'ADMIN_SUBSCRIPTIONS_FAILED', subsRes.error.message)
  if (usersRes.error) throw new ApiError(500, 'ADMIN_SUBSCRIPTIONS_FAILED', usersRes.error.message)

  const nameMap = new Map(
    (usersRes.data as { id: string; name: string }[]).map((u) => [u.id, u.name]),
  )

  return (subsRes.data as SubscriptionRow[]).map((row) => {
    const effectiveStatus = getAdminSubscriptionEffectiveStatus({
      isActive:  row.is_active,
      expiresAt: row.expires_at,
    })

    return {
      id:              row.id,
      userId:          row.user_id,
      userName:        nameMap.get(row.user_id) ?? null,
      planId:          row.plan_id,
      tier:            row.tier,
      isActive:        row.is_active,
      effectiveStatus,
      isEntitled:      effectiveStatus === 'active',
      startedAt:       row.started_at,
      expiresAt:       row.expires_at,
      durationMonths:  row.duration_months,
      createdAt:       row.created_at,
    }
  })
}

async function invokeAdminSubscriptionAccess(
  request: AdminSubscriptionAccessRequest,
): Promise<AdminSubscriptionAccessResponse> {
  const body: {
    action: AdminSubscriptionAccessAction
    userId: string
    reason?: string
    durationMonths?: AdminSubscriptionManualDuration
    expiresAt?: string
  } = {
    action: request.action,
    userId: request.userId,
  }
  if (request.reason) body.reason = request.reason
  if (request.durationMonths) body.durationMonths = request.durationMonths
  if (request.expiresAt) body.expiresAt = request.expiresAt

  const { data, error } = await supabase.functions.invoke<AdminSubscriptionAccessResponse>(
    'admin-subscriptions',
    { body },
  )

  if (error) {
    let status = 500
    let code = 'ADMIN_SUBSCRIPTION_UPDATE_FAILED'
    let message = error.message || 'Failed to update subscription.'

    const context = (error as { context?: unknown }).context
    if (context instanceof Response) {
      status = context.status
      try {
        const payload = await context.clone().json() as { error?: string; code?: string }
        if (payload.error) message = payload.error
        if (payload.code)  code    = payload.code
      } catch {
        // Keep the default function error message.
      }
    }

    throw new ApiError(status, code, message, error)
  }

  if (!data) {
    throw new ApiError(500, 'ADMIN_SUBSCRIPTION_UPDATE_FAILED', 'Subscription update returned an empty response.')
  }

  return data
}

export async function setSubscriptionActive(id: string, isActive: boolean): Promise<void> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new ApiError(500, 'ADMIN_SUBSCRIPTION_FETCH_FAILED', error.message)
  if (!data) throw new ApiError(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found.')

  await invokeAdminSubscriptionAccess({
    action: isActive ? 'restore_access' : 'disable_access',
    userId: (data as { user_id: string }).user_id,
  })
}

/**
 * Activate or deactivate a subscription for a user by userId.
 * This no longer creates subscription rows; grant/renew flows must go through
 * an explicit admin renewal path so every access change is audited.
 */
export async function setUserSubscriptionStatus(userId: string, isActive: boolean): Promise<void> {
  await invokeAdminSubscriptionAccess({
    action: isActive ? 'restore_access' : 'disable_access',
    userId,
  })
}

export async function renewAdminSubscription(
  userId: string,
  durationMonths: AdminSubscriptionManualDuration,
  reason?: string,
): Promise<AdminSubscriptionAccessResponse['subscription']> {
  const { subscription } = await invokeAdminSubscriptionAccess({
    action: 'renew',
    userId,
    durationMonths,
    reason,
  })
  return subscription
}

export async function extendAdminSubscription(
  userId: string,
  durationMonths: AdminSubscriptionManualDuration,
  reason?: string,
): Promise<AdminSubscriptionAccessResponse['subscription']> {
  const { subscription } = await invokeAdminSubscriptionAccess({
    action: 'extend',
    userId,
    durationMonths,
    reason,
  })
  return subscription
}

export async function setAdminSubscriptionCustomExpiry(
  userId: string,
  expiresAt: string,
  reason?: string,
): Promise<AdminSubscriptionAccessResponse['subscription']> {
  const { subscription } = await invokeAdminSubscriptionAccess({
    action: 'set_custom_expiry',
    userId,
    expiresAt,
    reason,
  })
  return subscription
}

// ── Books (Phase C) ───────────────────────────────────────────────────────────

export type BookStatus = 'draft' | 'published' | 'archived'

export interface AdminBook {
  id: string
  title: string
  author: string
  isbn: string | null
  description: string
  coverUrl: string | null
  priceCentavos: number
  stock: number
  status: BookStatus
  createdAt: string
}

export interface BookFormData {
  title: string
  author?: string
  isbn?: string | null
  description?: string
  coverUrl?: string | null
  priceCentavos: number
  stock: number
  status?: BookStatus
}

interface AdminBookRow {
  id:              string
  title:           string
  author:          string
  isbn:            string | null
  description:     string
  cover_url:       string | null
  price_centavos:  number
  stock:           number
  status:          BookStatus
  created_at:      string
}

function toAdminBook(row: AdminBookRow): AdminBook {
  return {
    id:             row.id,
    title:          normalizeBookTitle(row.title),
    author:         row.author,
    isbn:           row.isbn,
    description:    row.description,
    coverUrl:       normalizeBookCoverDisplayUrl(row.cover_url),
    priceCentavos:  row.price_centavos,
    stock:          row.stock,
    status:         row.status,
    createdAt:      row.created_at,
  }
}

export async function getAdminBooks(): Promise<AdminBook[]> {
  const { data, error } = await supabase
    .from('books')
    .select('id, title, author, isbn, description, cover_url, price_centavos, stock, status, created_at')
    .order('created_at', { ascending: false })

  if (error) throw new ApiError(500, 'ADMIN_BOOKS_FAILED', error.message)
  return (data as AdminBookRow[]).map(toAdminBook)
}

export async function getAdminBookById(bookId: string): Promise<AdminBook | undefined> {
  const { data, error } = await supabase
    .from('books')
    .select('id, title, author, isbn, description, cover_url, price_centavos, stock, status, created_at')
    .eq('id', bookId)
    .maybeSingle()

  if (error) throw new ApiError(500, 'ADMIN_BOOK_FETCH_FAILED', error.message)
  return data ? toAdminBook(data as AdminBookRow) : undefined
}

export async function createAdminBook(data: BookFormData): Promise<string> {
  const { data: row, error } = await supabase
    .from('books')
    .insert({
      title:           normalizeBookTitle(data.title),
      author:          data.author ?? '',
      isbn:            data.isbn ?? null,
      description:     data.description ?? '',
      cover_url:       normalizeBookCoverStorageKey(data.coverUrl),
      price_centavos:  data.priceCentavos,
      stock:           data.stock,
      status:          data.status ?? 'draft',
    })
    .select('id')
    .single()

  if (error) throw new ApiError(500, 'ADMIN_BOOK_CREATE_FAILED', error.message)
  return (row as { id: string }).id
}

export async function updateAdminBook(
  bookId: string,
  data: Partial<BookFormData>,
): Promise<void> {
  const update: Record<string, unknown> = {}
  if (data.title         !== undefined) update.title          = normalizeBookTitle(data.title)
  if (data.author        !== undefined) update.author         = data.author
  if (data.isbn          !== undefined) update.isbn           = data.isbn
  if (data.description   !== undefined) update.description    = data.description
  if (data.coverUrl !== undefined) {
    update.cover_url = normalizeBookCoverStorageKey(data.coverUrl)
  }
  if (data.priceCentavos !== undefined) update.price_centavos = data.priceCentavos
  if (data.stock         !== undefined) update.stock          = data.stock
  if (data.status        !== undefined) update.status         = data.status

  const { error } = await supabase
    .from('books')
    .update(update)
    .eq('id', bookId)

  if (error) throw new ApiError(500, 'ADMIN_BOOK_UPDATE_FAILED', error.message)
}

export async function setBookStatus(bookId: string, status: BookStatus): Promise<void> {
  const { error } = await supabase
    .from('books')
    .update({ status })
    .eq('id', bookId)
  if (error) throw new ApiError(500, 'ADMIN_BOOK_UPDATE_FAILED', error.message)
}

export async function deleteAdminBook(bookId: string): Promise<void> {
  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', bookId)
  if (error) throw new ApiError(500, 'ADMIN_BOOK_DELETE_FAILED', error.message)
}

// ── Book orders (Phase C) ─────────────────────────────────────────────────────

interface AdminOrderRow {
  id:                  string
  user_id:             string
  book_id:             string
  qty:                 number
  unit_price_centavos: number
  total_centavos:      number
  shipping_address:    ShippingAddress
  status:              OrderStatus
  paymongo_session_id: string | null
  tracking_no:         string | null
  ordered_at:          string
  paid_at:             string | null
  shipped_at:          string | null
  delivered_at:        string | null
  cancelled_at:        string | null
  books?:              { title: string; author: string } | null
  user_email?:         string | null
}

function toBookOrder(row: AdminOrderRow): BookOrder {
  return {
    id:                row.id,
    userId:            row.user_id,
    bookId:            row.book_id,
    bookTitle:         row.books?.title,
    bookAuthor:        row.books?.author,
    qty:               row.qty,
    unitPriceCentavos: row.unit_price_centavos,
    totalCentavos:     row.total_centavos,
    shippingAddress:   row.shipping_address,
    status:            row.status,
    paymongoSessionId: row.paymongo_session_id,
    trackingNo:        row.tracking_no,
    orderedAt:         row.ordered_at,
    paidAt:            row.paid_at,
    shippedAt:         row.shipped_at,
    deliveredAt:       row.delivered_at,
    cancelledAt:       row.cancelled_at,
  }
}

export async function getAdminOrders(): Promise<BookOrder[]> {
  const { data, error } = await supabase
    .from('book_orders')
    .select(`
      id, user_id, book_id, qty, unit_price_centavos, total_centavos,
      shipping_address, status, paymongo_session_id, tracking_no,
      ordered_at, paid_at, shipped_at, delivered_at, cancelled_at,
      books(title, author)
    `)
    .order('ordered_at', { ascending: false })

  if (error) throw new ApiError(500, 'ADMIN_ORDERS_FAILED', error.message)
  return (data as unknown as AdminOrderRow[]).map(toBookOrder)
}

/**
 * Admin status transitions:
 *  - pending     → paid       (usually webhook does this; admin override possible)
 *  - paid        → shipped    (admin sets tracking_no when shipping)
 *  - shipped     → delivered  (admin marks on confirmation)
 *  - any         → cancelled  (admin cancels; calls restock_book RPC to return stock)
 *
 * The corresponding *_at timestamp is set automatically by this function.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  opts: { trackingNo?: string } = {},
): Promise<void> {
  const now = new Date().toISOString()
  const update: Record<string, unknown> = { status }

  if (status === 'paid')      update.paid_at      = now
  if (status === 'shipped')   update.shipped_at   = now
  if (status === 'delivered') update.delivered_at = now
  if (status === 'cancelled') update.cancelled_at = now
  if (opts.trackingNo !== undefined) update.tracking_no = opts.trackingNo

  const { error } = await supabase
    .from('book_orders')
    .update(update)
    .eq('id', orderId)

  if (error) throw new ApiError(500, 'ADMIN_ORDER_UPDATE_FAILED', error.message)
}

/**
 * Cancel an order and restore the book's stock.
 * Uses the restock_book RPC (SECURITY DEFINER) so it works regardless of
 * the admin's row-level access to the books table.
 */
export async function cancelOrderAndRestock(order: BookOrder): Promise<void> {
  await updateOrderStatus(order.id, 'cancelled')
  const { error } = await supabase.rpc('restock_book', {
    p_book_id: order.bookId,
    p_qty:     order.qty,
  })
  if (error) throw new ApiError(500, 'ADMIN_ORDER_RESTOCK_FAILED', error.message)
}

// ── Homepage CMS: hero banner ────────────────────────────────────────────────

export async function getAdminHomeHero(): Promise<HomeHeroContent> {
  const { data, error } = await supabase
    .from('site_content')
    .select('key, value')
    .eq('section', HOME_HERO_SECTION)
    .in('key', Array.from(HOME_HERO_DB_KEYS))

  if (error) throw new ApiError(500, 'ADMIN_HOME_HERO_FAILED', error.message)
  return mergeHomeHeroRows(data as SiteContentHeroRow[])
}

export async function updateAdminHomeHero(content: HomeHeroContent): Promise<HomeHeroContent> {
  const rows = homeHeroContentToRows(content)

  const { error } = await supabase
    .from('site_content')
    .upsert(rows, { onConflict: 'section,key' })

  if (error) throw new ApiError(500, 'ADMIN_HOME_HERO_UPDATE_FAILED', error.message)
  return mergeHomeHeroRows(rows)
}

// -- Homepage CMS: contact CTA ------------------------------------------------

export async function getAdminLandingContactCta(): Promise<LandingContactCtaContent> {
  const { data, error } = await supabase
    .from('site_content')
    .select('key, value')
    .eq('section', LANDING_CONTACT_CTA_SECTION)
    .in('key', Array.from(LANDING_CONTACT_CTA_DB_KEYS))

  if (error) throw new ApiError(500, 'ADMIN_LANDING_CONTACT_CTA_FAILED', error.message)
  return mergeLandingContactCtaRows(data as SiteContentContactCtaRow[])
}

export async function updateAdminLandingContactCta(
  content: LandingContactCtaContent,
): Promise<LandingContactCtaContent> {
  const rows = landingContactCtaContentToRows(content)

  const { error } = await supabase
    .from('site_content')
    .upsert(rows, { onConflict: 'section,key' })

  if (error) throw new ApiError(500, 'ADMIN_LANDING_CONTACT_CTA_UPDATE_FAILED', error.message)
  return mergeLandingContactCtaRows(rows)
}

// -- Homepage CMS: contact page ----------------------------------------------

export async function getAdminContactPage(): Promise<ContactPageContent> {
  const { data, error } = await supabase
    .from('site_content')
    .select('key, value')
    .eq('section', CONTACT_PAGE_SECTION)
    .in('key', Array.from(CONTACT_PAGE_DB_KEYS))

  if (error) throw new ApiError(500, 'ADMIN_CONTACT_PAGE_FAILED', error.message)
  return mergeContactPageRows(data as SiteContentContactPageRow[])
}

export async function updateAdminContactPage(
  content: ContactPageContent,
): Promise<ContactPageContent> {
  const rows = contactPageContentToRows(content)

  const { error } = await supabase
    .from('site_content')
    .upsert(rows, { onConflict: 'section,key' })

  if (error) throw new ApiError(500, 'ADMIN_CONTACT_PAGE_UPDATE_FAILED', error.message)
  return mergeContactPageRows(rows)
}

// -- Homepage CMS: who we are page -------------------------------------------

export interface AdminWhoWeAreSection extends WhoWeArePageSection {
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
}

export interface AdminWhoWeArePageContent extends Omit<WhoWeArePageContent, 'sections'> {
  sections: AdminWhoWeAreSection[]
}

interface AdminWhoWeAreSectionRow {
  id: string
  title: string
  body: string
  sort_order: number
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

function toAdminWhoWeAreSection(row: AdminWhoWeAreSectionRow): AdminWhoWeAreSection {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getAdminWhoWeArePage(): Promise<AdminWhoWeArePageContent> {
  const { data: pageRows, error: pageError } = await supabase
    .from('site_content')
    .select('key, value')
    .eq('section', WHO_WE_ARE_PAGE_SECTION)
    .in('key', Array.from(WHO_WE_ARE_PAGE_DB_KEYS))

  if (pageError) throw new ApiError(500, 'ADMIN_WHO_WE_ARE_PAGE_FAILED', pageError.message)

  const { data: sectionRows, error: sectionError } = await supabase
    .from('who_we_are_sections')
    .select('id, title, body, sort_order, is_active, created_at, updated_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (sectionError) {
    throw new ApiError(500, 'ADMIN_WHO_WE_ARE_SECTIONS_FAILED', sectionError.message)
  }

  const sections = sortAdminRows((sectionRows ?? []) as AdminWhoWeAreSectionRow[])
    .map(toAdminWhoWeAreSection)
  const page = mergeWhoWeArePageRows(pageRows as SiteContentWhoWeArePageRow[], sections)

  return {
    eyebrow: page.eyebrow,
    title: page.title,
    sections,
  }
}

export async function saveAdminWhoWeArePage(
  content: AdminWhoWeArePageContent,
): Promise<AdminWhoWeArePageContent> {
  const pageRows = whoWeArePageContentToRows(content)

  const { error: pageError } = await supabase
    .from('site_content')
    .upsert(pageRows, { onConflict: 'section,key' })

  if (pageError) {
    throw new ApiError(500, 'ADMIN_WHO_WE_ARE_PAGE_UPDATE_FAILED', pageError.message)
  }

  const sectionRows = content.sections.map((section, index) => ({
    id: section.id,
    title: section.title.trim(),
    body: section.body.trim(),
    sort_order: index,
    is_active: section.isActive,
  }))

  if (sectionRows.length > 0) {
    const { error: sectionError } = await supabase
      .from('who_we_are_sections')
      .upsert(sectionRows, { onConflict: 'id' })

    if (sectionError) {
      throw new ApiError(500, 'ADMIN_WHO_WE_ARE_SECTIONS_SAVE_FAILED', sectionError.message)
    }
  }

  await deleteRowsMissingFrom(
    'who_we_are_sections',
    new Set(sectionRows.map((row) => row.id)),
    'ADMIN_WHO_WE_ARE_SECTIONS_STALE_FETCH_FAILED',
    'ADMIN_WHO_WE_ARE_SECTIONS_DELETE_FAILED',
  )

  return getAdminWhoWeArePage()
}

// -- Landing page CMS: FAQ page ----------------------------------------------

export interface AdminFaq {
  id: string
  categoryId: string | null
  category: string
  question: string
  answer: string
  sortOrder: number
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
}

export interface AdminFaqCategory {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
}

export interface AdminFaqPageContent extends FaqPageContent {
  categories: AdminFaqCategory[]
  faqs: AdminFaq[]
}

interface AdminFaqCategoryRow {
  id: string
  name: string
  sort_order: number
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

interface AdminFaqRow {
  id: string
  category_id: string | null
  category: string
  question: string
  answer: string
  sort_order: number
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

function toAdminFaqCategory(row: AdminFaqCategoryRow): AdminFaqCategory {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toAdminFaq(
  row: AdminFaqRow,
  categoriesById: Map<string, AdminFaqCategory>,
  categoryIdsByName: Map<string, string>,
): AdminFaq {
  const linkedCategory = row.category_id ? categoriesById.get(row.category_id) : null
  const fallbackCategoryId = row.category?.trim()
    ? categoryIdsByName.get(row.category.trim().toLocaleLowerCase()) ?? null
    : null
  const categoryId = linkedCategory ? row.category_id : fallbackCategoryId
  const category = categoryId ? categoriesById.get(categoryId) : null

  return {
    id: row.id,
    categoryId,
    category: category?.name ?? linkedCategory?.name ?? row.category,
    question: row.question,
    answer: row.answer,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getAdminFaqPageContent(): Promise<AdminFaqPageContent> {
  const { data: pageRows, error: pageError } = await supabase
    .from('site_content')
    .select('key, value')
    .eq('section', FAQ_PAGE_SECTION)
    .in('key', Array.from(FAQ_PAGE_DB_KEYS))

  if (pageError) throw new ApiError(500, 'ADMIN_FAQ_PAGE_COPY_FAILED', pageError.message)

  const { data: categoryRows, error: categoryError } = await supabase
    .from('faq_categories')
    .select('id, name, sort_order, is_active, created_at, updated_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (categoryError) throw new ApiError(500, 'ADMIN_FAQ_CATEGORIES_FAILED', categoryError.message)

  const categories = sortAdminRows((categoryRows ?? []) as AdminFaqCategoryRow[])
    .map(toAdminFaqCategory)
  const categoriesById = new Map(categories.map((category) => [category.id, category]))
  const categoryIdsByName = new Map(
    categories.map((category) => [category.name.trim().toLocaleLowerCase(), category.id]),
  )

  const { data: faqRows, error: faqError } = await supabase
    .from('faqs')
    .select('id, category_id, category, question, answer, sort_order, is_active, created_at, updated_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (faqError) throw new ApiError(500, 'ADMIN_FAQS_FAILED', faqError.message)

  const page = mergeFaqPageRows(pageRows as SiteContentFaqPageRow[])

  return {
    ...page,
    categories,
    faqs: sortAdminRows((faqRows ?? []) as AdminFaqRow[])
      .map((row) => toAdminFaq(row, categoriesById, categoryIdsByName)),
  }
}

export async function saveAdminFaqPageContent(
  content: AdminFaqPageContent,
): Promise<AdminFaqPageContent> {
  const pageRows = faqPageContentToRows(content)
  const { error: pageError } = await supabase
    .from('site_content')
    .upsert(pageRows, { onConflict: 'section,key' })

  if (pageError) throw new ApiError(500, 'ADMIN_FAQ_PAGE_COPY_UPDATE_FAILED', pageError.message)

  const categories = content.categories.map((category, categoryIndex) => ({
    ...category,
    sortOrder: categoryIndex,
  }))
  const categoryRows = categories.map((category) => ({
    id: category.id,
    name: category.name.trim(),
    sort_order: category.sortOrder,
    is_active: category.isActive,
  }))

  if (categoryRows.length > 0) {
    const { error } = await supabase
      .from('faq_categories')
      .upsert(categoryRows, { onConflict: 'id' })

    if (error) throw new ApiError(500, 'ADMIN_FAQ_CATEGORIES_SAVE_FAILED', error.message)
  }

  const categoriesById = new Map(categories.map((category) => [category.id, category]))
  const faqRows = content.faqs.map((faq) => ({
    id: faq.id,
    category_id: faq.categoryId,
    category: (faq.categoryId ? categoriesById.get(faq.categoryId)?.name : faq.category)?.trim() || faq.category.trim(),
    question: faq.question.trim(),
    answer: faq.answer.trim(),
    sort_order: Math.trunc(faq.sortOrder),
    is_active: faq.isActive,
  }))

  if (faqRows.length > 0) {
    const { error } = await supabase
      .from('faqs')
      .upsert(faqRows, { onConflict: 'id' })

    if (error) throw new ApiError(500, 'ADMIN_FAQS_SAVE_FAILED', error.message)
  }

  await deleteRowsMissingFrom(
    'faqs',
    new Set(faqRows.map((row) => row.id)),
    'ADMIN_FAQS_STALE_FETCH_FAILED',
    'ADMIN_FAQS_DELETE_FAILED',
  )

  await deleteRowsMissingFrom(
    'faq_categories',
    new Set(categoryRows.map((row) => row.id)),
    'ADMIN_FAQ_CATEGORIES_STALE_FETCH_FAILED',
    'ADMIN_FAQ_CATEGORIES_DELETE_FAILED',
  )

  return getAdminFaqPageContent()
}

// ── Homepage CMS: review classes/packages ────────────────────────────────────

export interface AdminReviewPackageFeature {
  id: string
  featureText: string
  sortOrder: number
}

export interface AdminReviewPackageOption {
  id: string
  title: string
  price: string
  sortOrder: number
  isActive: boolean
  features: AdminReviewPackageFeature[]
}

export interface AdminReviewPackage {
  id: string
  title: string
  description: string
  badge: string | null
  price: string | null
  onlineAccessMonths: number
  sortOrder: number
  isActive: boolean
  features: AdminReviewPackageFeature[]
  options: AdminReviewPackageOption[]
  createdAt: string | null
  updatedAt: string | null
}

export interface AdminReviewClassesContent {
  eyebrow: string
  heading: string
  packages: AdminReviewPackage[]
}

interface AdminReviewPackageFeatureRow {
  id: string
  feature_text: string
  sort_order: number
}

interface AdminReviewPackageOptionRow {
  id: string
  title: string
  price: string
  sort_order: number
  is_active: boolean
  review_package_option_features: AdminReviewPackageFeatureRow[] | null
}

interface AdminReviewPackageRow {
  id: string
  title: string
  description: string
  badge: string | null
  price: string | null
  online_access_months: number
  sort_order: number
  is_active: boolean
  created_at: string | null
  updated_at: string | null
  review_package_features: AdminReviewPackageFeatureRow[] | null
  review_package_options: AdminReviewPackageOptionRow[] | null
}

interface IdRow {
  id: string
}

const REVIEW_PACKAGE_SELECT = `
  id,
  title,
  description,
  badge,
  price,
  online_access_months,
  sort_order,
  is_active,
  created_at,
  updated_at,
  review_package_features (
    id,
    feature_text,
    sort_order
  ),
  review_package_options (
    id,
    title,
    price,
    sort_order,
    is_active,
    review_package_option_features (
      id,
      feature_text,
      sort_order
    )
  )
`

function sortAdminRows<T extends { sort_order: number; id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
}

function toAdminReviewPackageFeature(row: AdminReviewPackageFeatureRow): AdminReviewPackageFeature {
  return {
    id: row.id,
    featureText: row.feature_text,
    sortOrder: row.sort_order,
  }
}

function toAdminReviewPackageOption(row: AdminReviewPackageOptionRow): AdminReviewPackageOption {
  return {
    id: row.id,
    title: row.title,
    price: row.price,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    features: sortAdminRows(row.review_package_option_features ?? []).map(toAdminReviewPackageFeature),
  }
}

function toAdminReviewPackage(row: AdminReviewPackageRow): AdminReviewPackage {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    badge: row.badge,
    price: row.price,
    onlineAccessMonths: row.online_access_months,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    features: sortAdminRows(row.review_package_features ?? []).map(toAdminReviewPackageFeature),
    options: sortAdminRows(row.review_package_options ?? []).map(toAdminReviewPackageOption),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function deleteRowsMissingFrom(
  table: string,
  keepIds: Set<string>,
  fetchCode: string,
  deleteCode: string,
): Promise<void> {
  const { data, error } = await supabase
    .from(table)
    .select('id')

  if (error) throw new ApiError(500, fetchCode, error.message)

  const staleIds = ((data ?? []) as IdRow[])
    .map((row) => row.id)
    .filter((id) => !keepIds.has(id))

  if (staleIds.length === 0) return

  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .in('id', staleIds)

  if (deleteError) throw new ApiError(500, deleteCode, deleteError.message)
}

export async function getAdminReviewClassesContent(): Promise<AdminReviewClassesContent> {
  const { data: copyRows, error: copyError } = await supabase
    .from('site_content')
    .select('key, value')
    .eq('section', REVIEW_CLASSES_SECTION)
    .in('key', Array.from(REVIEW_CLASSES_DB_KEYS))

  if (copyError) throw new ApiError(500, 'ADMIN_REVIEW_CLASSES_COPY_FAILED', copyError.message)

  const { data: packageRows, error: packageError } = await supabase
    .from('review_packages')
    .select(REVIEW_PACKAGE_SELECT)
    .order('sort_order', { ascending: true })

  if (packageError) throw new ApiError(500, 'ADMIN_REVIEW_PACKAGES_FAILED', packageError.message)

  const section = mergeReviewClassesRows(copyRows as SiteContentReviewClassesRow[], [])

  return {
    eyebrow: section.eyebrow,
    heading: section.heading,
    packages: sortAdminRows((packageRows ?? []) as AdminReviewPackageRow[]).map(toAdminReviewPackage),
  }
}

export async function saveAdminReviewClassesContent(
  content: AdminReviewClassesContent,
): Promise<AdminReviewClassesContent> {
  const sectionRows = reviewClassesContentToRows(content)
  const { error: sectionError } = await supabase
    .from('site_content')
    .upsert(sectionRows, { onConflict: 'section,key' })

  if (sectionError) {
    throw new ApiError(500, 'ADMIN_REVIEW_CLASSES_COPY_UPDATE_FAILED', sectionError.message)
  }

  const packages = content.packages.map((pkg, packageIndex) => ({
    ...pkg,
    sortOrder: packageIndex,
    features: pkg.features.map((feature, featureIndex) => ({
      ...feature,
      sortOrder: featureIndex,
    })),
    options: pkg.options.map((option, optionIndex) => ({
      ...option,
      sortOrder: optionIndex,
      features: option.features.map((feature, featureIndex) => ({
        ...feature,
        sortOrder: featureIndex,
      })),
    })),
  }))

  const packageRows = packages.map((pkg) => ({
    id: pkg.id,
    title: pkg.title.trim(),
    description: pkg.description.trim(),
    badge: pkg.badge?.trim() || null,
    price: pkg.price?.trim() || null,
    online_access_months: pkg.onlineAccessMonths,
    sort_order: pkg.sortOrder,
    is_active: pkg.isActive,
  }))

  if (packageRows.length > 0) {
    const { error } = await supabase
      .from('review_packages')
      .upsert(packageRows, { onConflict: 'id' })

    if (error) throw new ApiError(500, 'ADMIN_REVIEW_PACKAGES_SAVE_FAILED', error.message)
  }

  await deleteRowsMissingFrom(
    'review_packages',
    new Set(packageRows.map((row) => row.id)),
    'ADMIN_REVIEW_PACKAGES_STALE_FETCH_FAILED',
    'ADMIN_REVIEW_PACKAGES_DELETE_FAILED',
  )

  const featureRows = packages.flatMap((pkg) =>
    pkg.features.map((feature) => ({
      id: feature.id,
      package_id: pkg.id,
      feature_text: feature.featureText.trim(),
      sort_order: feature.sortOrder,
    })),
  )

  if (featureRows.length > 0) {
    const { error } = await supabase
      .from('review_package_features')
      .upsert(featureRows, { onConflict: 'id' })

    if (error) throw new ApiError(500, 'ADMIN_REVIEW_PACKAGE_FEATURES_SAVE_FAILED', error.message)
  }

  await deleteRowsMissingFrom(
    'review_package_features',
    new Set(featureRows.map((row) => row.id)),
    'ADMIN_REVIEW_PACKAGE_FEATURES_STALE_FETCH_FAILED',
    'ADMIN_REVIEW_PACKAGE_FEATURES_DELETE_FAILED',
  )

  const optionRows = packages.flatMap((pkg) =>
    pkg.options.map((option) => ({
      id: option.id,
      package_id: pkg.id,
      title: option.title.trim(),
      price: option.price.trim(),
      sort_order: option.sortOrder,
      is_active: option.isActive,
    })),
  )

  if (optionRows.length > 0) {
    const { error } = await supabase
      .from('review_package_options')
      .upsert(optionRows, { onConflict: 'id' })

    if (error) throw new ApiError(500, 'ADMIN_REVIEW_PACKAGE_OPTIONS_SAVE_FAILED', error.message)
  }

  await deleteRowsMissingFrom(
    'review_package_options',
    new Set(optionRows.map((row) => row.id)),
    'ADMIN_REVIEW_PACKAGE_OPTIONS_STALE_FETCH_FAILED',
    'ADMIN_REVIEW_PACKAGE_OPTIONS_DELETE_FAILED',
  )

  const optionFeatureRows = packages.flatMap((pkg) =>
    pkg.options.flatMap((option) =>
      option.features.map((feature) => ({
        id: feature.id,
        option_id: option.id,
        feature_text: feature.featureText.trim(),
        sort_order: feature.sortOrder,
      })),
    ),
  )

  if (optionFeatureRows.length > 0) {
    const { error } = await supabase
      .from('review_package_option_features')
      .upsert(optionFeatureRows, { onConflict: 'id' })

    if (error) throw new ApiError(500, 'ADMIN_REVIEW_PACKAGE_OPTION_FEATURES_SAVE_FAILED', error.message)
  }

  await deleteRowsMissingFrom(
    'review_package_option_features',
    new Set(optionFeatureRows.map((row) => row.id)),
    'ADMIN_REVIEW_PACKAGE_OPTION_FEATURES_STALE_FETCH_FAILED',
    'ADMIN_REVIEW_PACKAGE_OPTION_FEATURES_DELETE_FAILED',
  )

  return getAdminReviewClassesContent()
}

// ── Homepage CMS: testimonials ───────────────────────────────────────────────

export interface AdminTestimonial {
  id: string
  name: string
  initials: string
  title: string
  affiliation: string
  quote: string
  rating: number
  sortOrder: number
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
}

export interface AdminTestimonialsContent {
  eyebrow: string
  heading: string
  testimonials: AdminTestimonial[]
}

interface AdminTestimonialRow {
  id: string
  name: string
  initials: string
  title: string
  affiliation: string
  quote: string
  rating: number
  sort_order: number
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

function toAdminTestimonial(row: AdminTestimonialRow): AdminTestimonial {
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    title: row.title,
    affiliation: row.affiliation,
    quote: row.quote,
    rating: row.rating,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getAdminTestimonialsContent(): Promise<AdminTestimonialsContent> {
  const { data: copyRows, error: copyError } = await supabase
    .from('site_content')
    .select('key, value')
    .eq('section', TESTIMONIALS_SECTION)
    .in('key', Array.from(TESTIMONIALS_DB_KEYS))

  if (copyError) throw new ApiError(500, 'ADMIN_TESTIMONIALS_COPY_FAILED', copyError.message)

  const { data: testimonialRows, error: testimonialError } = await supabase
    .from('testimonials')
    .select('id, name, initials, title, affiliation, quote, rating, sort_order, is_active, created_at, updated_at')
    .order('sort_order', { ascending: true })

  if (testimonialError) throw new ApiError(500, 'ADMIN_TESTIMONIALS_FAILED', testimonialError.message)

  const section = mergeTestimonialsRows(copyRows as SiteContentTestimonialsRow[], [])

  return {
    eyebrow: section.eyebrow,
    heading: section.heading,
    testimonials: sortAdminRows((testimonialRows ?? []) as AdminTestimonialRow[]).map(toAdminTestimonial),
  }
}

export async function saveAdminTestimonialsContent(
  content: AdminTestimonialsContent,
): Promise<AdminTestimonialsContent> {
  const sectionRows = testimonialsContentToRows(content)
  const { error: sectionError } = await supabase
    .from('site_content')
    .upsert(sectionRows, { onConflict: 'section,key' })

  if (sectionError) {
    throw new ApiError(500, 'ADMIN_TESTIMONIALS_COPY_UPDATE_FAILED', sectionError.message)
  }

  const testimonials = content.testimonials.map((testimonial, testimonialIndex) => ({
    ...testimonial,
    sortOrder: testimonialIndex,
  }))

  const testimonialRows = testimonials.map((testimonial) => ({
    id: testimonial.id,
    name: testimonial.name.trim(),
    initials: testimonial.initials.trim(),
    title: testimonial.title.trim(),
    affiliation: testimonial.affiliation.trim(),
    quote: testimonial.quote.trim(),
    rating: Math.trunc(testimonial.rating),
    sort_order: testimonial.sortOrder,
    is_active: testimonial.isActive,
  }))

  if (testimonialRows.length > 0) {
    const { error } = await supabase
      .from('testimonials')
      .upsert(testimonialRows, { onConflict: 'id' })

    if (error) throw new ApiError(500, 'ADMIN_TESTIMONIALS_SAVE_FAILED', error.message)
  }

  await deleteRowsMissingFrom(
    'testimonials',
    new Set(testimonialRows.map((row) => row.id)),
    'ADMIN_TESTIMONIALS_STALE_FETCH_FAILED',
    'ADMIN_TESTIMONIALS_DELETE_FAILED',
  )

  return getAdminTestimonialsContent()
}

// ── Homepage CMS: announcements ───────────────────────────────────────────────

export interface AdminAnnouncement {
  id: string
  title: string
  body: string
  publishedAt: string
  enabled: boolean
  ctaLabel: string | null
  ctaHref: string | null
  icon: string | null
  category: string | null
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface AnnouncementFormData {
  title: string
  body: string
  publishedAt: string
  enabled: boolean
  ctaLabel: string | null
  ctaHref: string | null
  icon: string | null
  category: string | null
  displayOrder: number
}

interface AnnouncementRow {
  id:            string
  title:         string
  body:          string
  published_at:  string
  enabled:       boolean
  cta_label:     string | null
  cta_href:      string | null
  icon:          string | null
  category:      string | null
  display_order: number
  created_at:    string
  updated_at:    string
}

function toAdminAnnouncement(row: AnnouncementRow): AdminAnnouncement {
  return {
    id:           row.id,
    title:        row.title,
    body:         row.body,
    publishedAt:  row.published_at,
    enabled:      row.enabled,
    ctaLabel:     row.cta_label,
    ctaHref:      row.cta_href,
    icon:         row.icon,
    category:     row.category,
    displayOrder: row.display_order,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  }
}

const ANNOUNCEMENT_COLS =
  'id, title, body, published_at, enabled, cta_label, cta_href, icon, category, display_order, created_at, updated_at'

export async function getAdminAnnouncements(): Promise<AdminAnnouncement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select(ANNOUNCEMENT_COLS)
    .order('display_order', { ascending: true })
    .order('published_at', { ascending: false })

  if (error) throw new ApiError(500, 'ADMIN_ANNOUNCEMENTS_FAILED', error.message)
  return (data as AnnouncementRow[]).map(toAdminAnnouncement)
}

export async function createAdminAnnouncement(data: AnnouncementFormData): Promise<AdminAnnouncement> {
  const { data: row, error } = await supabase
    .from('announcements')
    .insert({
      title:         data.title,
      body:          data.body,
      published_at:  data.publishedAt,
      enabled:       data.enabled,
      cta_label:     data.ctaLabel,
      cta_href:      data.ctaHref,
      icon:          data.icon,
      category:      data.category,
      display_order: data.displayOrder,
    })
    .select(ANNOUNCEMENT_COLS)
    .single()

  if (error) throw new ApiError(500, 'ADMIN_ANNOUNCEMENT_CREATE_FAILED', error.message)
  return toAdminAnnouncement(row as AnnouncementRow)
}

export async function updateAdminAnnouncement(
  id: string,
  data: Partial<AnnouncementFormData>,
): Promise<AdminAnnouncement> {
  const update: Record<string, unknown> = {}
  if (data.title         !== undefined) update.title         = data.title
  if (data.body          !== undefined) update.body          = data.body
  if (data.publishedAt   !== undefined) update.published_at  = data.publishedAt
  if (data.enabled       !== undefined) update.enabled       = data.enabled
  if ('ctaLabel'  in data)              update.cta_label     = data.ctaLabel  ?? null
  if ('ctaHref'   in data)              update.cta_href      = data.ctaHref   ?? null
  if ('icon'      in data)              update.icon          = data.icon      ?? null
  if ('category'  in data)              update.category      = data.category  ?? null
  if (data.displayOrder  !== undefined) update.display_order = data.displayOrder

  const { data: row, error } = await supabase
    .from('announcements')
    .update(update)
    .eq('id', id)
    .select(ANNOUNCEMENT_COLS)
    .single()

  if (error) throw new ApiError(500, 'ADMIN_ANNOUNCEMENT_UPDATE_FAILED', error.message)
  return toAdminAnnouncement(row as AnnouncementRow)
}

export async function setAnnouncementEnabled(id: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('announcements')
    .update({ enabled })
    .eq('id', id)

  if (error) throw new ApiError(500, 'ADMIN_ANNOUNCEMENT_UPDATE_FAILED', error.message)
}

export async function deleteAdminAnnouncement(id: string): Promise<void> {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id)

  if (error) throw new ApiError(500, 'ADMIN_ANNOUNCEMENT_DELETE_FAILED', error.message)
}

// ── Homepage CMS: welcome videos ──────────────────────────────────────────────

export interface AdminWelcomeVideo {
  id: string
  title: string
  description: string
  videoUrl: string | null
  thumbnailUrl: string | null
  ctaLabel: string | null
  ctaHref: string | null
  enabled: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface WelcomeVideoFormData {
  title: string
  description: string
  videoUrl: string | null
  thumbnailUrl: string | null
  ctaLabel: string | null
  ctaHref: string | null
  enabled: boolean
  displayOrder: number
}

interface WelcomeVideoRow {
  id:            string
  title:         string
  description:   string
  video_url:     string | null
  thumbnail_url: string | null
  cta_label:     string | null
  cta_href:      string | null
  enabled:       boolean
  display_order: number
  created_at:    string
  updated_at:    string
}

function toAdminWelcomeVideo(row: WelcomeVideoRow): AdminWelcomeVideo {
  return {
    id:           row.id,
    title:        row.title,
    description:  row.description,
    videoUrl:     row.video_url,
    thumbnailUrl: row.thumbnail_url,
    ctaLabel:     row.cta_label,
    ctaHref:      row.cta_href,
    enabled:      row.enabled,
    displayOrder: row.display_order,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  }
}

const WELCOME_VIDEO_COLS =
  'id, title, description, video_url, thumbnail_url, cta_label, cta_href, enabled, display_order, created_at, updated_at'

export async function getAdminWelcomeVideos(): Promise<AdminWelcomeVideo[]> {
  const { data, error } = await supabase
    .from('welcome_videos')
    .select(WELCOME_VIDEO_COLS)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw new ApiError(500, 'ADMIN_WELCOME_VIDEOS_FAILED', error.message)
  return (data as WelcomeVideoRow[]).map(toAdminWelcomeVideo)
}

export async function createAdminWelcomeVideo(data: WelcomeVideoFormData): Promise<AdminWelcomeVideo> {
  const { data: row, error } = await supabase
    .from('welcome_videos')
    .insert({
      title:         data.title,
      description:   data.description,
      video_url:     data.videoUrl,
      thumbnail_url: data.thumbnailUrl,
      cta_label:     data.ctaLabel,
      cta_href:      data.ctaHref,
      enabled:       data.enabled,
      display_order: data.displayOrder,
    })
    .select(WELCOME_VIDEO_COLS)
    .single()

  if (error) throw new ApiError(500, 'ADMIN_WELCOME_VIDEO_CREATE_FAILED', error.message)
  return toAdminWelcomeVideo(row as WelcomeVideoRow)
}

export async function updateAdminWelcomeVideo(
  id: string,
  data: Partial<WelcomeVideoFormData>,
): Promise<AdminWelcomeVideo> {
  const update: Record<string, unknown> = {}
  if (data.title         !== undefined) update.title         = data.title
  if (data.description   !== undefined) update.description   = data.description
  if (data.videoUrl      !== undefined) update.video_url     = data.videoUrl
  if ('thumbnailUrl' in data)           update.thumbnail_url = data.thumbnailUrl ?? null
  if ('ctaLabel'     in data)           update.cta_label     = data.ctaLabel     ?? null
  if ('ctaHref'      in data)           update.cta_href      = data.ctaHref      ?? null
  if (data.enabled       !== undefined) update.enabled       = data.enabled
  if (data.displayOrder  !== undefined) update.display_order = data.displayOrder

  const { data: row, error } = await supabase
    .from('welcome_videos')
    .update(update)
    .eq('id', id)
    .select(WELCOME_VIDEO_COLS)
    .single()

  if (error) throw new ApiError(500, 'ADMIN_WELCOME_VIDEO_UPDATE_FAILED', error.message)
  return toAdminWelcomeVideo(row as WelcomeVideoRow)
}

export async function setWelcomeVideoEnabled(id: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('welcome_videos')
    .update({ enabled })
    .eq('id', id)

  if (error) throw new ApiError(500, 'ADMIN_WELCOME_VIDEO_UPDATE_FAILED', error.message)
}

export async function deleteAdminWelcomeVideo(id: string): Promise<void> {
  const { error } = await supabase
    .from('welcome_videos')
    .delete()
    .eq('id', id)

  if (error) throw new ApiError(500, 'ADMIN_WELCOME_VIDEO_DELETE_FAILED', error.message)
}
