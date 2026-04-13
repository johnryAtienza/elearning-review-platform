import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, Plus, Trash2, ChevronUp, ChevronDown,
  ImageIcon, CheckCircle2, Loader2, Upload, Info, FileSearch,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { uploadToStorage } from '@/services/storageClient'
import { storagePaths } from '@/services/storagePaths'
import { UPLOAD_LIMITS } from '@/constants/upload'
import { cn } from '@/utils/cn'
import { MathText } from '@/components/MathText'
import {
  getAdminLessons,
  createAdminQuiz,
  updateAdminQuiz,
  deleteQuizQuestionsByIds,
  upsertQuizQuestion,
  type AdminQuizFull,
  type AdminQuizOption,
} from '@/services/admin.service'

// ── Draft types ───────────────────────────────────────────────────────────────

interface DraftOption {
  key: string
  text: string
  file: File | null
  preview: string | null   // blob URL (new) or existing URL (edit)
}

interface DraftQuestion {
  key: string              // doubles as DB id (pre-generated UUID)
  isNew: boolean           // true if added this session (not yet in DB)
  isDirty: boolean         // true if existing question was modified
  questionText: string
  questionFile: File | null
  questionPreview: string | null
  useQuestionImage: boolean
  useOptionImages: boolean
  options: DraftOption[]
  correctAnswer: number
  answerText: string
  answerFile: File | null
  answerPreview: string | null
  useAnswerImage: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string { return crypto.randomUUID() }

function newOption(): DraftOption {
  return { key: uid(), text: '', file: null, preview: null }
}

function newQuestion(): DraftQuestion {
  return {
    key:             uid(),
    isNew:           true,
    isDirty:         false,
    questionText:    '',
    questionFile:    null,
    questionPreview: null,
    useQuestionImage: false,
    useOptionImages:  false,
    options:         [newOption(), newOption()],
    correctAnswer:   0,
    answerText:      '',
    answerFile:      null,
    answerPreview:   null,
    useAnswerImage:  false,
  }
}

function fromExistingQuestion(q: AdminQuizFull['questions'][number]): DraftQuestion {
  return {
    key:              q.id,
    isNew:            false,
    isDirty:          false,
    questionText:     q.questionText,
    questionFile:     null,
    questionPreview:  q.questionImageUrl,
    useQuestionImage: Boolean(q.questionImageUrl),
    useOptionImages:  q.options.some((o) => Boolean(o.imageUrl)),
    options: q.options.map((o) => ({
      key:     uid(),
      text:    o.text,
      file:    null,
      preview: o.imageUrl,
    })),
    correctAnswer:  q.correctAnswer,
    answerText:     q.answerText ?? '',
    answerFile:     null,
    answerPreview:  q.answerImageUrl ?? null,
    useAnswerImage: Boolean(q.answerImageUrl),
  }
}

// ── Main component ────────────────────────────────────────────────────────────

interface QuizModalProps {
  quiz: AdminQuizFull | null   // null = create mode
  onClose: () => void
  onSaved: (quizId: string, lessonId: string) => void
}

export function QuizModal({ quiz, onClose, onSaved }: QuizModalProps) {
  const isEdit = quiz !== null

  const [lessonId,     setLessonId]     = useState(quiz?.lessonId ?? '')
  const [description,  setDescription]  = useState(quiz?.description ?? '')
  const [randomize,    setRandomize]    = useState(quiz?.randomize ?? false)
  const [lessons,      setLessons]      = useState<{ id: string; title: string; courseTitle: string }[]>([])
  const [lessonsLoad,  setLessonsLoad]  = useState(true)
  const [questions,    setQuestions]    = useState<DraftQuestion[]>(
    quiz ? quiz.questions.map(fromExistingQuestion) : [newQuestion()],
  )
  const [saving,            setSaving]           = useState(false)
  const [uploadStep,        setUploadStep]        = useState('')
  const [error,             setError]             = useState<string | null>(null)
  const [activePreviewKey,  setActivePreviewKey]  = useState<string | null>(null)

  // Tracks DB ids of questions explicitly deleted during this edit session
  const deletedIdsRef = useRef<string[]>([])

  // ── Load lessons (runs once on mount) ────────────────────────────────────────
  const initialLessonId = useRef(quiz?.lessonId ?? '')
  useEffect(() => {
    getAdminLessons()
      .then((ls) => {
        const mapped = ls.map((l) => ({ id: l.id, title: l.title, courseTitle: l.courseTitle }))
        setLessons(mapped)
        // Auto-select first lesson only if no lesson was pre-selected
        if (!initialLessonId.current && mapped.length > 0) setLessonId(mapped[0].id)
      })
      .catch(() => setError('Failed to load lessons.'))
      .finally(() => setLessonsLoad(false))
  }, [])

  // ── Validation ────────────────────────────────────────────────────────────────
  function validate(): string | null {
    if (!lessonId) return 'Please select a lesson.'
    if (questions.length === 0) return 'Add at least one question.'
    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi]
      if (!q.questionText.trim() && !q.questionFile && !q.questionPreview) {
        return `Question ${qi + 1}: provide a question text or image.`
      }
      if (q.options.length < 2) return `Question ${qi + 1}: needs at least 2 options.`
      for (let oi = 0; oi < q.options.length; oi++) {
        const o = q.options[oi]
        if (!o.text.trim() && !o.file && !o.preview) {
          return `Question ${qi + 1}, option ${oi + 1}: provide text or image.`
        }
      }
    }
    return null
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }

    setSaving(true)
    setError(null)

    try {
      // 1. Get or create quiz record
      setUploadStep('Preparing quiz…')
      const trimmedDescription = description.trim() || null
      const quizId = isEdit
        ? quiz.id
        : await createAdminQuiz(lessonId, trimmedDescription, randomize)
      if (isEdit) await updateAdminQuiz(quizId, trimmedDescription, randomize)

      // 2. In edit mode, delete only questions that were explicitly removed
      if (isEdit && deletedIdsRef.current.length > 0) {
        setUploadStep('Removing deleted questions…')
        await deleteQuizQuestionsByIds(deletedIdsRef.current)
      }

      // 3. Only process questions that are new or were edited.
      //    In create mode every question is new so this is the full list.
      const questionsToSave = isEdit
        ? questions.filter((q) => q.isNew || q.isDirty)
        : questions

      if (questionsToSave.length === 0) {
        // Nothing changed — skip straight to done
        onSaved(quizId, lessonId)
        return
      }

      // 4. Count images to upload (only from questions being saved)
      let totalImages = 0
      let uploadedImages = 0
      for (const q of questionsToSave) {
        if (q.questionFile) totalImages++
        if (q.answerFile)   totalImages++
        for (const o of q.options) { if (o.file) totalImages++ }
      }

      // 5. Process each question that needs saving
      for (let si = 0; si < questionsToSave.length; si++) {
        const q = questionsToSave[si]
        // Order is derived from the full questions array (includes untouched ones)
        const order = questions.findIndex((qq) => qq.key === q.key) + 1

        // Upload question image
        let questionImageUrl = (!q.questionFile ? q.questionPreview : null)
        if (q.questionFile) {
          uploadedImages++
          setUploadStep(`Uploading images (${uploadedImages}/${totalImages})…`)
          const ext  = q.questionFile.name.split('.').pop() ?? 'webp'
          const path = storagePaths.quizQuestionImage(q.key, ext)
          const res  = await uploadToStorage(q.questionFile, path)
          questionImageUrl = res.publicUrl
        }

        // Upload option images
        const finalOptions: AdminQuizOption[] = []
        for (let oi = 0; oi < q.options.length; oi++) {
          const o = q.options[oi]
          let imageUrl = (!o.file ? o.preview : null)
          if (o.file) {
            uploadedImages++
            setUploadStep(`Uploading images (${uploadedImages}/${totalImages})…`)
            const ext  = o.file.name.split('.').pop() ?? 'webp'
            const path = storagePaths.quizOptionImage(q.key, oi, ext)
            const res  = await uploadToStorage(o.file, path)
            imageUrl = res.publicUrl
          }
          finalOptions.push({ text: o.text.trim(), imageUrl })
        }

        // Upload answer image
        let answerImageUrl: string | null = (!q.answerFile ? q.answerPreview : null)
        if (q.answerFile) {
          uploadedImages++
          setUploadStep(`Uploading images (${uploadedImages}/${totalImages})…`)
          const ext  = q.answerFile.name.split('.').pop() ?? 'webp'
          const path = storagePaths.quizAnswerImage(q.key, ext)
          const res  = await uploadToStorage(q.answerFile, path)
          answerImageUrl = res.publicUrl
        }

        // Upsert question
        setUploadStep(`Saving question ${si + 1}/${questionsToSave.length}…`)
        await upsertQuizQuestion({
          id:               q.key,
          quizId,
          questionText:     q.questionText.trim(),
          questionImageUrl: questionImageUrl ?? null,
          options:          finalOptions,
          correctAnswer:    q.correctAnswer,
          order,
          answerText:       q.answerText.trim() || null,
          answerImageUrl:   answerImageUrl ?? null,
        })
      }

      onSaved(quizId, lessonId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save quiz.')
    } finally {
      setSaving(false)
      setUploadStep('')
    }
  }

  // ── Question list mutations ───────────────────────────────────────────────────

  // Mark existing questions dirty when their content changes
  const updateQuestion = useCallback((key: string, patch: Partial<DraftQuestion>) => {
    setQuestions((prev) => prev.map((q) => {
      if (q.key !== key) return q
      return { ...q, ...patch, isDirty: q.isNew ? false : true }
    }))
  }, [])

  // Track removed DB questions; shift-dirty any existing questions whose order changed
  const removeQuestion = useCallback((key: string) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.key === key)
      if (idx < 0) return prev
      const target = prev[idx]
      if (!target.isNew) {
        // Will need a targeted DELETE for this question
        deletedIdsRef.current.push(target.key)
      }
      const next = prev.filter((q) => q.key !== key)
      // All existing questions after the removed slot shift up by 1 → mark dirty
      return next.map((q, i) => (i >= idx && !q.isNew) ? { ...q, isDirty: true } : q)
    })
  }, [])

  // Mark both swapped questions dirty (their order value changed)
  const moveQuestion = useCallback((key: string, dir: -1 | 1) => {
    setQuestions((prev) => {
      const i = prev.findIndex((q) => q.key === key)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next.map((q, idx) =>
        (idx === i || idx === j) && !q.isNew ? { ...q, isDirty: true } : q,
      )
    })
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={saving ? undefined : onClose} />

      {/* Dialog */}
      <div className="relative flex flex-col w-full max-w-2xl rounded-xl border bg-background shadow-xl max-h-[92vh]">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{isEdit ? 'Edit Quiz' : 'New Quiz'}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {questions.length} question{questions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* Lesson select */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Lesson <span className="text-destructive">*</span>
              </label>
              <select
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
                disabled={saving || lessonsLoad || isEdit}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                {lessonsLoad ? (
                  <option>Loading lessons…</option>
                ) : lessons.length === 0 ? (
                  <option value="">No lessons available</option>
                ) : (
                  lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.courseTitle} › {l.title}
                    </option>
                  ))
                )}
              </select>
              {isEdit && (
                <p className="text-xs text-muted-foreground">Lesson cannot be changed after creation.</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Description</label>
                <span className="text-xs text-muted-foreground">
                  {description.length}/1000
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
                placeholder="Add instructions or additional details for this quiz…"
                disabled={saving}
                rows={4}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Randomize toggle */}
            <div className="rounded-lg border bg-muted/20 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <label className="text-sm font-medium">Randomize Questions</label>
                  <div className="relative group/rnd inline-flex">
                    <Info className="size-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-default transition-colors" />
                    <div className={cn(
                      'pointer-events-none absolute top-full left-0 mt-1.5 z-50',
                      'w-72 rounded-md border bg-popover text-popover-foreground shadow-md',
                      'px-3 py-2 text-xs leading-relaxed',
                      'opacity-0 group-hover/rnd:opacity-100 transition-opacity duration-150',
                    )}>
                      <p className="font-semibold mb-1">Randomize Questions</p>
                      <p className="text-muted-foreground">
                        When <span className="font-medium text-foreground">On</span>, questions will appear in a different random order each time a student takes the quiz.
                      </p>
                      <p className="text-muted-foreground mt-1">
                        When <span className="font-medium text-foreground">Off</span> (default), questions follow the order you set here.
                      </p>
                    </div>
                  </div>
                </div>
                <Toggle
                  label={randomize ? 'On' : 'Off'}
                  checked={randomize}
                  disabled={saving}
                  onChange={setRandomize}
                />
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-4">
              {questions.map((q, qi) => (
                <QuestionEditor
                  key={q.key}
                  question={q}
                  index={qi}
                  total={questions.length}
                  disabled={saving}
                  showPreview={activePreviewKey === q.key}
                  onTogglePreview={() => setActivePreviewKey((prev) => prev === q.key ? null : q.key)}
                  onChange={(patch) => updateQuestion(q.key, patch)}
                  onRemove={() => removeQuestion(q.key)}
                  onMoveUp={() => moveQuestion(q.key, -1)}
                  onMoveDown={() => moveQuestion(q.key, 1)}
                />
              ))}
            </div>

            {/* Add question */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={saving}
              onClick={() => setQuestions((prev) => [...prev, newQuestion()])}
            >
              <Plus className="mr-2 size-4" />
              Add Question
            </Button>

          </div>

          {/* Footer */}
          <div className="shrink-0 border-t px-6 py-4 space-y-3">
            {/* Upload progress */}
            {saving && uploadStep && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin shrink-0" />
                {uploadStep}
              </div>
            )}

            {/* Error */}
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || lessonsLoad}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                {isEdit ? 'Save changes' : 'Create quiz'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── QuestionEditor ────────────────────────────────────────────────────────────

interface QuestionEditorProps {
  question: DraftQuestion
  index: number
  total: number
  disabled: boolean
  showPreview: boolean
  onTogglePreview: () => void
  onChange: (patch: Partial<DraftQuestion>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function QuestionEditor({
  question, index, total, disabled,
  showPreview, onTogglePreview,
  onChange, onRemove, onMoveUp, onMoveDown,
}: QuestionEditorProps) {
  const previewRef = useRef<HTMLDivElement>(null)
  const prevShowPreview = useRef(false)

  // Scroll into view when preview opens
  useEffect(() => {
    if (showPreview && !prevShowPreview.current) {
      setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
    }
    prevShowPreview.current = showPreview
  }, [showPreview])

  function updateOption(key: string, patch: Partial<DraftOption>) {
    onChange({
      options: question.options.map((o) => o.key === key ? { ...o, ...patch } : o),
    })
  }

  function addOption() {
    if (question.options.length >= 4) return
    onChange({ options: [...question.options, newOption()] })
  }

  function removeOption(key: string) {
    if (question.options.length <= 2) return
    const next = question.options.filter((o) => o.key !== key)
    onChange({
      options: next,
      correctAnswer: Math.min(question.correctAnswer, next.length - 1),
    })
  }

  return (
    <div className="rounded-xl border bg-card">
      {/* Question header */}
      <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5 rounded-t-xl">
        <span className="text-sm font-semibold">Question {index + 1}</span>
        <div className="flex items-center gap-0.5">
          <div className="relative group/preview inline-flex">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn('size-7', showPreview && 'text-primary bg-primary/10')}
              onClick={onTogglePreview}
            >
              <FileSearch className="size-3.5" />
            </Button>
            <div className={cn(
              'pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50',
              'whitespace-nowrap rounded-md border bg-popover text-popover-foreground shadow-md',
              'px-2 py-1 text-xs',
              'opacity-0 group-hover/preview:opacity-100 transition-opacity duration-150',
            )}>
              {showPreview ? 'Hide preview' : 'Show preview'}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="size-7" disabled={disabled || index === 0} onClick={onMoveUp}>
            <ChevronUp className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7" disabled={disabled || index === total - 1} onClick={onMoveDown}>
            <ChevronDown className="size-3.5" />
          </Button>
          {total > 1 && (
            <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={disabled} onClick={onRemove}>
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Question text */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Question
              </label>
              <MathHint />
            </div>
            <Toggle
              label="Use image"
              checked={question.useQuestionImage}
              disabled={disabled}
              onChange={(v) => onChange({ useQuestionImage: v })}
            />
          </div>

          <Input
            value={question.questionText}
            onChange={(e) => onChange({ questionText: e.target.value })}
            placeholder={question.useQuestionImage ? 'Optional caption…' : 'Enter question text…'}
            disabled={disabled}
          />

          {question.useQuestionImage && (
            <ImagePicker
              preview={question.questionPreview}
              accept="image/jpeg,image/png,image/webp,image/gif"
              maxBytes={UPLOAD_LIMITS.IMAGE}
              label="question image"
              disabled={disabled}
              onFile={(file) => {
                onChange({
                  questionFile: file,
                  questionPreview: file ? URL.createObjectURL(file) : null,
                })
              }}
              onRemove={() => onChange({ questionFile: null, questionPreview: null })}
            />
          )}
        </div>

        {/* Options */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Options
              </label>
              <MathHint />
            </div>
            <Toggle
              label="Use images"
              checked={question.useOptionImages}
              disabled={disabled}
              onChange={(v) => onChange({ useOptionImages: v })}
            />
          </div>

          <p className="text-xs text-muted-foreground -mt-1">
            Click an option row to mark it as the correct answer.
          </p>

          <div className="space-y-2">
            {question.options.map((opt, oi) => (
              <OptionRow
                key={opt.key}
                option={opt}
                index={oi}
                isCorrect={question.correctAnswer === oi}
                useImage={question.useOptionImages}
                disabled={disabled}
                canRemove={question.options.length > 2}
                onSelect={() => onChange({ correctAnswer: oi })}
                onChange={(patch) => updateOption(opt.key, patch)}
                onRemove={() => removeOption(opt.key)}
              />
            ))}
          </div>

          {question.options.length < 4 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              disabled={disabled}
              onClick={addOption}
            >
              <Plus className="mr-1.5 size-3.5" />
              Add option
            </Button>
          )}
        </div>

        {/* Answer explanation */}
        <div className="space-y-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-primary/70">
              Answer Explanation
            </label>
            <Toggle
              label="Add image"
              checked={question.useAnswerImage}
              disabled={disabled}
              onChange={(v) => onChange({ useAnswerImage: v })}
            />
          </div>

          <p className="text-xs text-muted-foreground -mt-1">
            Optional. Explain why the correct answer is right. Shown to students after submission.
          </p>

          <textarea
            value={question.answerText}
            onChange={(e) => onChange({ answerText: e.target.value })}
            placeholder="Type the answer explanation here…"
            disabled={disabled}
            rows={3}
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />

          {question.useAnswerImage && (
            <ImagePicker
              preview={question.answerPreview}
              accept="image/jpeg,image/png,image/webp"
              maxBytes={UPLOAD_LIMITS.IMAGE}
              label="answer image"
              disabled={disabled}
              onFile={(file) => onChange({
                answerFile:    file,
                answerPreview: file ? URL.createObjectURL(file) : null,
              })}
              onRemove={() => onChange({ answerFile: null, answerPreview: null })}
            />
          )}
        </div>

        {/* Preview panel */}
        {showPreview && (
          <div ref={previewRef} className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>

            {/* Question */}
            <div className="space-y-1.5">
              {question.questionPreview && (
                <img
                  src={question.questionPreview}
                  alt="Question"
                  className="rounded-md border max-h-40 object-contain"
                />
              )}
              {question.questionText ? (
                <p className="font-semibold text-sm leading-snug">
                  <MathText text={question.questionText} />
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic">No question text yet.</p>
              )}
            </div>

            {/* Options */}
            <ol className="space-y-1">
              {question.options.map((opt, oi) => (
                <li key={opt.key} className={cn(
                  'flex items-start gap-2 text-sm px-2 py-1 rounded-md',
                  question.correctAnswer === oi && 'bg-primary/10 text-primary font-medium',
                )}>
                  <span className={cn(
                    'shrink-0 font-semibold w-5 text-right',
                    question.correctAnswer === oi ? 'text-primary' : 'text-muted-foreground',
                  )}>
                    {OPTION_LABELS[oi]}.
                  </span>
                  <div className="flex flex-col gap-1">
                    {opt.preview && (
                      <img src={opt.preview} alt={opt.text || `Option ${OPTION_LABELS[oi]}`} className="rounded object-contain max-h-14" />
                    )}
                    {opt.text
                      ? <MathText text={opt.text} />
                      : <span className="text-muted-foreground italic text-xs">Empty</span>
                    }
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}

// ── OptionRow ─────────────────────────────────────────────────────────────────

interface OptionRowProps {
  option: DraftOption
  index: number
  isCorrect: boolean
  useImage: boolean
  disabled: boolean
  canRemove: boolean
  onSelect: () => void
  onChange: (patch: Partial<DraftOption>) => void
  onRemove: () => void
}

const OPTION_LABELS = ['A', 'B', 'C', 'D']

function OptionRow({
  option, index, isCorrect, useImage, disabled, canRemove,
  onSelect, onChange, onRemove,
}: OptionRowProps) {
  return (
    <div
      className={cn(
        'rounded-lg border transition-colors cursor-pointer',
        isCorrect
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground/40',
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Label / correct indicator */}
        <span
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold mt-0.5 select-none',
            isCorrect
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {isCorrect ? <CheckCircle2 className="size-3.5" /> : OPTION_LABELS[index]}
        </span>

        {/* Inputs */}
        <div className="flex-1 space-y-2 min-w-0" onClick={(e) => e.stopPropagation()}>
          <Input
            value={option.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder={useImage ? 'Optional label…' : 'Option text…'}
            disabled={disabled}
            className="h-8 text-sm"
          />
          {useImage && (
            <ImagePicker
              preview={option.preview}
              accept="image/jpeg,image/png,image/webp,image/gif"
              maxBytes={UPLOAD_LIMITS.IMAGE}
              label="option image"
              disabled={disabled}
              compact
              onFile={(file) => onChange({ file, preview: file ? URL.createObjectURL(file) : null })}
              onRemove={() => onChange({ file: null, preview: null })}
            />
          )}
        </div>

        {/* Remove button */}
        {canRemove && (
          <button
            type="button"
            className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            disabled={disabled}
            onClick={(e) => { e.stopPropagation(); onRemove() }}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── ImagePicker ───────────────────────────────────────────────────────────────

interface ImagePickerProps {
  preview: string | null
  accept: string
  maxBytes: number
  label: string
  disabled: boolean
  compact?: boolean
  onFile: (file: File | null) => void
  onRemove: () => void
}

function ImagePicker({ preview, accept, maxBytes, label, disabled, compact, onFile, onRemove }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [sizeErr, setSizeErr] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > maxBytes) {
      setSizeErr(`Max ${(maxBytes / 1024 / 1024).toFixed(0)} MB`)
      return
    }
    setSizeErr(null)
    onFile(file)
  }

  return (
    <div className="space-y-1">
      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt={label}
            className={cn(
              'rounded-md object-cover border',
              compact ? 'max-h-20 max-w-full' : 'max-h-36 max-w-full',
            )}
          />
          <div className="absolute inset-0 flex items-center justify-center gap-1.5 rounded-md bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
            <button
              type="button"
              className="flex items-center gap-1 rounded bg-white/90 px-2 py-1 text-xs font-medium text-black"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-3" />
              Replace
            </button>
            <button
              type="button"
              className="flex items-center gap-1 rounded bg-white/90 px-2 py-1 text-xs font-medium text-black"
              disabled={disabled}
              onClick={onRemove}
            >
              <X className="size-3" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed transition-colors',
            'border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            compact ? 'py-2 px-3' : 'py-4',
          )}
        >
          <ImageIcon className={cn('text-muted-foreground', compact ? 'size-3.5' : 'size-5')} />
          <span className="text-xs text-muted-foreground">Upload {label}</span>
        </button>
      )}

      {sizeErr && <p className="text-xs text-destructive">{sizeErr}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
    </div>
  )
}

// ── MathHint ──────────────────────────────────────────────────────────────────
// Info icon that shows a tooltip explaining the $...$ math syntax.

function MathHint() {
  return (
    <div className="relative group/math inline-flex">
      <Info className="size-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-default transition-colors" />
      <div
        className={cn(
          'pointer-events-none absolute top-full left-0 mt-1.5 z-50',
          'w-64 rounded-md border bg-popover text-popover-foreground shadow-md',
          'px-3 py-2 text-xs leading-relaxed',
          'opacity-0 group-hover/math:opacity-100 transition-opacity duration-150',
        )}
      >
        <p className="font-semibold mb-1">Math expressions</p>
        <p className="text-muted-foreground">
          Wrap LaTeX with <code className="bg-muted px-1 rounded">$...$</code> to render as math.
        </p>
        <p className="text-muted-foreground mt-1">
          Example: <code className="bg-muted px-1 rounded">{'$a^{n+2} b^{n+3}$'}</code>
        </p>
      </div>
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string
  checked: boolean
  disabled: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer select-none">
      <span className="text-xs text-muted-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-4 w-7 shrink-0 rounded-full border-2 border-transparent transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-primary' : 'bg-input',
        )}
      >
        <span
          className={cn(
            'pointer-events-none block size-3 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-3' : 'translate-x-0',
          )}
        />
      </button>
    </label>
  )
}
