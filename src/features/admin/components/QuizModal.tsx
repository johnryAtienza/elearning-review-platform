import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, Plus, Trash2, ChevronUp, ChevronDown,
  ImageIcon, CheckCircle2, Loader2, Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { uploadToStorage } from '@/services/storageClient'
import { storagePaths } from '@/services/storagePaths'
import { UPLOAD_LIMITS } from '@/constants/upload'
import { cn } from '@/utils/cn'
import {
  getAdminLessons,
  createAdminQuiz,
  deleteQuizQuestions,
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
  questionText: string
  questionFile: File | null
  questionPreview: string | null
  useQuestionImage: boolean
  useOptionImages: boolean
  options: DraftOption[]
  correctAnswer: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string { return crypto.randomUUID() }

function newOption(): DraftOption {
  return { key: uid(), text: '', file: null, preview: null }
}

function newQuestion(): DraftQuestion {
  return {
    key: uid(),
    questionText: '',
    questionFile: null,
    questionPreview: null,
    useQuestionImage: false,
    useOptionImages: false,
    options: [newOption(), newOption()],
    correctAnswer: 0,
  }
}

function fromExistingQuestion(q: AdminQuizFull['questions'][number]): DraftQuestion {
  return {
    key:              q.id,
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
    correctAnswer: q.correctAnswer,
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

  const [lessonId,    setLessonId]    = useState(quiz?.lessonId ?? '')
  const [lessons,     setLessons]     = useState<{ id: string; title: string; courseTitle: string }[]>([])
  const [lessonsLoad, setLessonsLoad] = useState(true)
  const [questions,   setQuestions]   = useState<DraftQuestion[]>(
    quiz ? quiz.questions.map(fromExistingQuestion) : [newQuestion()],
  )
  const [saving,      setSaving]      = useState(false)
  const [uploadStep,  setUploadStep]  = useState('')
  const [error,       setError]       = useState<string | null>(null)

  // ── Load lessons ─────────────────────────────────────────────────────────────
  useEffect(() => {
    getAdminLessons()
      .then((ls) => {
        const mapped = ls.map((l) => ({ id: l.id, title: l.title, courseTitle: l.courseTitle }))
        setLessons(mapped)
        if (!lessonId && mapped.length > 0) setLessonId(mapped[0].id)
      })
      .catch(() => setError('Failed to load lessons.'))
      .finally(() => setLessonsLoad(false))
  }, [lessonId])

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
      const quizId = isEdit ? quiz.id : await createAdminQuiz(lessonId)

      // 2. In edit mode, delete all existing questions (we re-upsert by key/id)
      if (isEdit) {
        setUploadStep('Clearing old questions…')
        await deleteQuizQuestions(quizId)
      }

      // 3. Count images to upload
      let totalImages = 0
      let uploadedImages = 0
      for (const q of questions) {
        if (q.questionFile) totalImages++
        for (const o of q.options) { if (o.file) totalImages++ }
      }

      // 4. Process each question
      for (let qi = 0; qi < questions.length; qi++) {
        const q = questions[qi]

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

        // Upsert question
        setUploadStep(`Saving question ${qi + 1}/${questions.length}…`)
        await upsertQuizQuestion({
          id:               q.key,
          quizId,
          questionText:     q.questionText.trim(),
          questionImageUrl: questionImageUrl ?? null,
          options:          finalOptions,
          correctAnswer:    q.correctAnswer,
          order:            qi + 1,
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
  const updateQuestion = useCallback((key: string, patch: Partial<DraftQuestion>) => {
    setQuestions((prev) => prev.map((q) => q.key === key ? { ...q, ...patch } : q))
  }, [])

  const removeQuestion = useCallback((key: string) => {
    setQuestions((prev) => prev.filter((q) => q.key !== key))
  }, [])

  const moveQuestion = useCallback((key: string, dir: -1 | 1) => {
    setQuestions((prev) => {
      const i = prev.findIndex((q) => q.key === key)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
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

            {/* Questions */}
            <div className="space-y-4">
              {questions.map((q, qi) => (
                <QuestionEditor
                  key={q.key}
                  question={q}
                  index={qi}
                  total={questions.length}
                  disabled={saving}
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
  onChange: (patch: Partial<DraftQuestion>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function QuestionEditor({
  question, index, total, disabled,
  onChange, onRemove, onMoveUp, onMoveDown,
}: QuestionEditorProps) {
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
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Question header */}
      <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5">
        <span className="text-sm font-semibold">Question {index + 1}</span>
        <div className="flex items-center gap-0.5">
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
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Question
            </label>
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
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Options
            </label>
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
