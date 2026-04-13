/**
 * storagePaths.ts — browser-safe storage key helpers
 *
 * Centralises storage path conventions. Import this anywhere in the browser bundle.
 * (The equivalent in storage.service.ts is server-side only and cannot be imported here.)
 */

export const storagePaths = {
  /** e.g. thumbnails/course-abc123.webp */
  courseThumbnail: (courseId: string, ext = 'webp') =>
    `thumbnails/course-${courseId}.${ext}`,

  /** e.g. videos/lessons/lesson-abc123.mp4 */
  lessonVideo: (lessonId: string, ext = 'mp4') =>
    `videos/lessons/lesson-${lessonId}.${ext}`,

  /** e.g. reviewers/lesson-abc123.pdf */
  reviewerPdf: (lessonId: string) =>
    `reviewers/lesson-${lessonId}.pdf`,

  /** e.g. avatars/user-abc123.webp */
  userAvatar: (userId: string, ext = 'webp') =>
    `avatars/user-${userId}.${ext}`,

  /** e.g. quizzes/questions/abc123/image.webp */
  quizQuestionImage: (questionId: string, ext = 'webp') =>
    `quizzes/questions/${questionId}/image.${ext}`,

  /** e.g. quizzes/questions/abc123/option-0.webp */
  quizOptionImage: (questionId: string, optionIndex: number, ext = 'webp') =>
    `quizzes/questions/${questionId}/option-${optionIndex}.${ext}`,

  /** e.g. quizzes/questions/abc123/answer.webp */
  quizAnswerImage: (questionId: string, ext = 'webp') =>
    `quizzes/questions/${questionId}/answer.${ext}`,
}
