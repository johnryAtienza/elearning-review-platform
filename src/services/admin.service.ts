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
import type { BookOrder, OrderStatus, ShippingAddress } from '@/features/books/types'

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

export interface AdminCourse {
  id: string
  title: string
  description: string
  category: string
  categoryId: string | null
  duration: string
  isPublished: boolean
  lessonCount: number
  thumbnailUrl: string | null
  createdAt: string
}

export interface CourseFormData {
  title: string
  description: string
  categoryId?: string | null
}

export interface AdminLesson {
  id: string
  courseId: string
  courseTitle: string
  title: string
  order: number
  /** Curriculum week (1-based). Null until backfill runs or admin sets it. */
  weekNumber: number | null
  /** Curriculum day (1-based, sequential within course). Day 1 = free for everyone. */
  dayNumber: number | null
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

export interface AdminQuiz {
  id: string
  lessonId: string
  lessonTitle: string
  courseTitle: string
  description: string | null
  randomize: boolean
  questionCount: number
  createdAt: string
}

export interface AdminQuizFull extends AdminQuiz {
  questions: AdminQuizQuestion[]
}

export interface LessonFormData {
  courseId: string
  title: string
  order: number
  weekNumber?: number | null
  dayNumber?: number | null
  durationMinutes?: number | null
}

export interface CourseOption {
  id: string
  title: string
}

export interface AdminSubscription {
  id: string
  userId: string
  userName: string | null
  planId: string
  isActive: boolean
  startedAt: string
  expiresAt: string | null
  createdAt: string
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

// ── Raw DB shapes ─────────────────────────────────────────────────────────────

interface CategoryRef {
  id: string
  name: string
}

interface CourseRow {
  id: string
  title: string
  description: string
  category: string
  category_id: string | null
  cat: CategoryRef | null
  duration: string
  is_published: boolean
  thumbnail_url: string | null
  created_at: string
  lessons: { count: number }[]
}

// ── Raw quiz DB shapes ────────────────────────────────────────────────────────

interface QuizRow {
  id: string
  lesson_id: string
  description: string | null
  randomize_questions: boolean
  created_at: string
  lessons: { title: string; courses: { title: string } | null } | null
  quiz_questions: { count: number }[]
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

interface LessonRow {
  id: string
  course_id: string
  title: string
  order: number
  week_number: number | null
  day_number: number | null
  duration_minutes: number | null
  video_url: string | null
  reviewer_pdf_url: string | null
  created_at: string
  courses: { title: string } | null
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
  is_active: boolean
  started_at: string
  expires_at: string | null
  created_at: string
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats> {
  const [coursesRes, lessonsRes, usersRes, subsRes, completionsRes, completionsCountRes] = await Promise.all([
    supabase.from('courses').select('is_published', { count: 'exact', head: false }),
    supabase.from('lessons').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
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

// ── Courses ───────────────────────────────────────────────────────────────────

export async function getAdminCourses(): Promise<AdminCourse[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, description, category, category_id, duration, is_published, thumbnail_url, created_at, lessons:lessons(count), cat:categories(id,name)')
    .order('created_at', { ascending: false })

  if (error) throw new ApiError(500, 'ADMIN_COURSES_FAILED', error.message)

  return (data as unknown as CourseRow[]).map((row) => ({
    id:           row.id,
    title:        row.title,
    description:  row.description ?? '',
    category:     row.cat?.name ?? row.category ?? '',
    categoryId:   row.category_id ?? null,
    duration:     row.duration,
    isPublished:  row.is_published,
    lessonCount:  row.lessons[0]?.count ?? 0,
    thumbnailUrl: row.thumbnail_url,
    createdAt:    row.created_at,
  }))
}

export async function createCourse(data: CourseFormData): Promise<string> {
  const { data: row, error } = await supabase
    .from('courses')
    .insert({
      title:        data.title,
      description:  data.description,
      category:     '',
      category_id:  data.categoryId ?? null,
      duration:     '',
      is_published: false,
    })
    .select('id')
    .single()

  if (error) throw new ApiError(500, 'ADMIN_COURSE_CREATE_FAILED', error.message)
  return (row as { id: string }).id
}

export async function updateCourse(
  courseId: string,
  data: Partial<CourseFormData & { thumbnailUrl: string }>,
): Promise<void> {
  const update: Record<string, unknown> = {}
  if (data.title        !== undefined) update.title         = data.title
  if (data.description  !== undefined) update.description   = data.description
  if (data.thumbnailUrl !== undefined) update.thumbnail_url = data.thumbnailUrl
  if ('categoryId' in data)            update.category_id   = data.categoryId ?? null

  const { error } = await supabase
    .from('courses')
    .update(update)
    .eq('id', courseId)

  if (error) throw new ApiError(500, 'ADMIN_COURSE_UPDATE_FAILED', error.message)
}

export async function setCoursePublished(courseId: string, isPublished: boolean): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .update({ is_published: isPublished })
    .eq('id', courseId)

  if (error) throw new ApiError(500, 'ADMIN_COURSE_UPDATE_FAILED', error.message)
}

export async function deleteCourse(courseId: string): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId)

  if (error) throw new ApiError(500, 'ADMIN_COURSE_DELETE_FAILED', error.message)
}

// ── Lessons ───────────────────────────────────────────────────────────────────

export async function getAdminLessons(): Promise<AdminLesson[]> {
  const { data, error } = await supabase
    .from('lessons')
    .select('id, course_id, title, order, week_number, day_number, duration_minutes, video_url, reviewer_pdf_url, created_at, courses(title)')
    .order('course_id')
    .order('order', { ascending: true })

  if (error) throw new ApiError(500, 'ADMIN_LESSONS_FAILED', error.message)

  return (data as unknown as LessonRow[]).map((row) => ({
    id:              row.id,
    courseId:        row.course_id,
    courseTitle:     row.courses?.title ?? 'Unknown',
    title:           row.title,
    order:           row.order,
    weekNumber:      row.week_number ?? null,
    dayNumber:       row.day_number  ?? null,
    durationMinutes: row.duration_minutes ?? null,
    videoUrl:        row.video_url,
    reviewerPdfUrl:  row.reviewer_pdf_url,
    createdAt:       row.created_at,
  }))
}

export async function getCoursesForSelect(): Promise<CourseOption[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('id, title')
    .order('title')

  if (error) throw new ApiError(500, 'ADMIN_COURSES_FAILED', error.message)
  return data as CourseOption[]
}

/** Returns the highest `order` value among lessons in a course, or 0 if none. */
export async function getMaxLessonOrderInCourse(courseId: string): Promise<number> {
  const { data, error } = await supabase
    .from('lessons')
    .select('order')
    .eq('course_id', courseId)
    .order('order', { ascending: false })
    .limit(1)

  if (error) throw new ApiError(500, 'ADMIN_LESSON_ORDER_FAILED', error.message)
  return (data as { order: number }[] | null)?.[0]?.order ?? 0
}

export async function createAdminLesson(data: LessonFormData): Promise<string> {
  const { data: row, error } = await supabase
    .from('lessons')
    .insert({
      course_id:        data.courseId,
      title:            data.title,
      order:            data.order,
      week_number:      data.weekNumber ?? null,
      day_number:       data.dayNumber  ?? null,
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
  if (data.courseId        !== undefined) update.course_id         = data.courseId
  if (data.title           !== undefined) update.title             = data.title
  if (data.order           !== undefined) update.order             = data.order
  if (data.weekNumber      !== undefined) update.week_number       = data.weekNumber
  if (data.dayNumber       !== undefined) update.day_number        = data.dayNumber
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

// ── Quizzes ───────────────────────────────────────────────────────────────────

export async function getAdminQuizzes(): Promise<AdminQuiz[]> {
  const { data, error } = await supabase
    .from('quizzes')
    .select('id, lesson_id, description, randomize_questions, created_at, lessons(title, courses(title)), quiz_questions(count)')
    .order('created_at', { ascending: false })

  if (error) throw new ApiError(500, 'ADMIN_QUIZZES_FAILED', error.message)

  return (data as unknown as QuizRow[]).map((row) => ({
    id:            row.id,
    lessonId:      row.lesson_id,
    lessonTitle:   row.lessons?.title ?? 'Unknown lesson',
    courseTitle:   row.lessons?.courses?.title ?? 'Unknown course',
    description:   row.description ?? null,
    randomize:     row.randomize_questions ?? false,
    questionCount: row.quiz_questions[0]?.count ?? 0,
    createdAt:     row.created_at,
  }))
}

export async function getAdminQuizFull(quizId: string): Promise<AdminQuizFull | null> {
  const [quizRes, questionsRes] = await Promise.all([
    supabase
      .from('quizzes')
      .select('id, lesson_id, description, randomize_questions, created_at, lessons(title, courses(title))')
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
    questionImageUrl: q.question_image_url,
    options: (q.options ?? []).map((o) => ({ text: o.text ?? '', imageUrl: o.image_url })),
    correctAnswer:    q.correct_answer,
    order:            q.order,
    answerText:       q.answer_text ?? null,
    answerImageUrl:   q.answer_image_url ?? null,
  }))

  return {
    id:            quiz.id,
    lessonId:      quiz.lesson_id,
    lessonTitle:   quiz.lessons?.title ?? 'Unknown lesson',
    courseTitle:   quiz.lessons?.courses?.title ?? 'Unknown course',
    description:   quiz.description ?? null,
    randomize:     quiz.randomize_questions ?? false,
    questionCount: questions.length,
    createdAt:     quiz.created_at,
    questions,
  }
}

export async function createAdminQuiz(lessonId: string, description?: string | null, randomize?: boolean): Promise<string> {
  const { data, error } = await supabase
    .from('quizzes')
    .insert({ lesson_id: lessonId, description: description ?? null, randomize_questions: randomize ?? false })
    .select('id')
    .single()

  if (error) throw new ApiError(500, 'ADMIN_QUIZ_CREATE_FAILED', error.message)
  return (data as { id: string }).id
}

export async function updateAdminQuiz(quizId: string, description: string | null, randomize: boolean): Promise<void> {
  const { error } = await supabase
    .from('quizzes')
    .update({ description, randomize_questions: randomize })
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
      question_image_url: params.questionImageUrl,
      options: params.options.map((o) => ({ text: o.text, image_url: o.imageUrl })),
      correct_answer:     params.correctAnswer,
      order:              params.order,
      answer_text:        params.answerText,
      answer_image_url:   params.answerImageUrl,
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

// ── Subscriptions ─────────────────────────────────────────────────────────────

/**
 * Fetches all subscriptions, merged with user names from the admin_user_list
 * view. Two queries are needed because subscriptions.user_id references
 * auth.users (not profiles), so a direct PostgREST join to profiles is unavailable.
 *
 * Required SQL (run once in Supabase dashboard):
 *   CREATE POLICY "subscriptions: admin updates all"
 *     ON public.subscriptions FOR UPDATE USING (public.is_admin());
 */
export async function getAdminSubscriptions(): Promise<AdminSubscription[]> {
  const [subsRes, usersRes] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('id, user_id, plan_id, is_active, started_at, expires_at, created_at')
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

  return (subsRes.data as SubscriptionRow[]).map((row) => ({
    id:        row.id,
    userId:    row.user_id,
    userName:  nameMap.get(row.user_id) ?? null,
    planId:    row.plan_id,
    isActive:  row.is_active,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }))
}

export async function setSubscriptionActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) throw new ApiError(500, 'ADMIN_SUBSCRIPTION_UPDATE_FAILED', error.message)
}

/**
 * Activate or deactivate a subscription for a user by userId.
 * Creates a new subscription row if none exists (for activation).
 *
 * Required SQL policies (run once):
 *   CREATE POLICY "subscriptions: admin inserts"
 *     ON public.subscriptions FOR INSERT WITH CHECK (public.is_admin());
 *   CREATE POLICY "subscriptions: admin updates all"
 *     ON public.subscriptions FOR UPDATE USING (public.is_admin());
 */
export async function setUserSubscriptionStatus(userId: string, isActive: boolean): Promise<void> {
  if (isActive) {
    // Upsert: create subscription if none exists, otherwise re-activate
    const { error } = await supabase
      .from('subscriptions')
      .upsert(
        { user_id: userId, is_active: true, tier: 'standard', started_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
    if (error) throw new ApiError(500, 'ADMIN_SUBSCRIPTION_UPDATE_FAILED', error.message)
  } else {
    const { error } = await supabase
      .from('subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId)
    if (error) throw new ApiError(500, 'ADMIN_SUBSCRIPTION_UPDATE_FAILED', error.message)
  }
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
    title:          row.title,
    author:         row.author,
    isbn:           row.isbn,
    description:    row.description,
    coverUrl:       row.cover_url,
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
      title:           data.title,
      author:          data.author ?? '',
      isbn:            data.isbn ?? null,
      description:     data.description ?? '',
      cover_url:       data.coverUrl ?? null,
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
  if (data.title         !== undefined) update.title          = data.title
  if (data.author        !== undefined) update.author         = data.author
  if (data.isbn          !== undefined) update.isbn           = data.isbn
  if (data.description   !== undefined) update.description    = data.description
  if (data.coverUrl      !== undefined) update.cover_url      = data.coverUrl
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
  videoUrl: string
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
  videoUrl: string
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
  video_url:     string
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
