import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DestructiveConfirmModal, LoadError } from '../../features/admin/components/AdminTable'
import {
  getAdminWhoWeArePage,
  saveAdminWhoWeArePage,
  type AdminWhoWeArePageContent,
  type AdminWhoWeAreSection,
} from '@s-class/api/admin.service'
import { DEFAULT_WHO_WE_ARE_PAGE_CONTENT } from '@s-class/api/homeContentApi'

const EMPTY_CONTENT: AdminWhoWeArePageContent = {
  eyebrow: DEFAULT_WHO_WE_ARE_PAGE_CONTENT.eyebrow,
  title: DEFAULT_WHO_WE_ARE_PAGE_CONTENT.title,
  sections: DEFAULT_WHO_WE_ARE_PAGE_CONTENT.sections.map((section) => ({
    ...section,
    id: crypto.randomUUID(),
    isActive: true,
    createdAt: null,
    updatedAt: null,
  })),
}

type SectionDeleteTarget = {
  id: string
  label: string
}

function createSection(sortOrder: number): AdminWhoWeAreSection {
  return {
    id: crypto.randomUUID(),
    title: '',
    body: '',
    sortOrder,
    isActive: true,
    createdAt: null,
    updatedAt: null,
  }
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction
  if (target < 0 || target >= items.length) return items

  const next = [...items]
  const [item] = next.splice(index, 1)
  if (item === undefined) return items
  next.splice(target, 0, item)
  return next
}

function normalizeForSave(content: AdminWhoWeArePageContent): AdminWhoWeArePageContent {
  return {
    eyebrow: content.eyebrow.trim(),
    title: content.title.trim(),
    sections: content.sections.map((section, index) => ({
      ...section,
      title: section.title.trim(),
      body: section.body.trim(),
      sortOrder: index,
    })),
  }
}

function validate(content: AdminWhoWeArePageContent): string | null {
  if (!content.eyebrow) return 'Page eyebrow is required.'
  if (!content.title) return 'Page title is required.'

  for (const [index, section] of content.sections.entries()) {
    const label = section.title || `Section ${index + 1}`
    if (!section.title) return `${label} needs a title.`
    if (!section.body) return `${label} needs body text.`
  }

  return null
}

export function AdminWhoWeArePage() {
  const [form,      setForm]      = useState<AdminWhoWeArePageContent>(EMPTY_CONTENT)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<AdminWhoWeAreSection | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [success,   setSuccess]   = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SectionDeleteTarget | null>(null)
  const hasLoadedContentRef = useRef(false)
  const saveTimerRef = useRef<number | null>(null)
  const latestFormRef = useRef(form)
  const savingRef = useRef(false)
  const pendingSaveRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setLoadError(null)
    getAdminWhoWeArePage()
      .then((content) => {
        if (!cancelled) {
          setForm(content)
          setSaveError(null)
          setSuccess(null)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load Who We Are page.')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    latestFormRef.current = form
  }, [form])

  useEffect(() => {
    if (loading) return

    if (!hasLoadedContentRef.current) {
      hasLoadedContentRef.current = true
      return
    }

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = window.setTimeout(() => {
      void saveLatestContent()
    }, 700)

    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current)
      }
    }
  }, [form, loading])

  function updateForm(updater: (current: AdminWhoWeArePageContent) => AdminWhoWeArePageContent) {
    setForm(updater)
    setSaveError(null)
    setSuccess(null)
  }

  function setSection(sectionId: string, nextSection: AdminWhoWeAreSection) {
    updateForm((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id === sectionId ? nextSection : section),
    }))
  }

  function openAddSectionModal() {
    setAddModalOpen(true)
  }

  function addSection(title: string, body: string) {
    updateForm((current) => ({
      ...current,
      sections: [
        ...current.sections,
        {
          ...createSection(current.sections.length),
          title,
          body,
        },
      ],
    }))
    setAddModalOpen(false)
  }

  function updateSectionContent(sectionId: string, title: string, body: string) {
    updateForm((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId ? { ...section, title, body } : section,
      ),
    }))
    setEditingSection(null)
  }

  function removeSection(sectionId: string) {
    updateForm((current) => ({
      ...current,
      sections: current.sections.filter((section) => section.id !== sectionId),
    }))
    setDeleteTarget(null)
  }

  function moveSection(index: number, direction: -1 | 1) {
    updateForm((current) => ({
      ...current,
      sections: moveItem(current.sections, index, direction),
    }))
  }

  async function saveLatestContent() {
    if (savingRef.current) {
      pendingSaveRef.current = true
      return
    }

    savingRef.current = true
    setSaving(true)

    try {
      do {
        pendingSaveRef.current = false

        const normalized = normalizeForSave(latestFormRef.current)
        const validationError = validate(normalized)

        if (validationError) {
          setSaveError(validationError)
          setSuccess(null)
          return
        }

        await saveAdminWhoWeArePage(normalized)
      } while (pendingSaveRef.current)

      setSaveError(null)
      setSuccess('Changes saved.')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save Who We Are page.')
      setSuccess(null)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const disabled = loading
  const activeCount = form.sections.filter((section) => section.isActive).length

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Who We Are Page</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? 'Loading...' : `${form.sections.length} total / ${activeCount} active`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={openAddSectionModal} disabled={disabled}>
            <Plus className="mr-2 size-4" />
            Add Section
          </Button>
          {saving && (
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Saving changes...
            </span>
          )}
        </div>
      </div>

      <LoadError message={loadError} />

      {success && (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          {success}
        </div>
      )}

      {saveError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {saveError}
        </div>
      )}

      <section className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15">
            <FileText className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Page Header</h2>
            <p className="text-xs text-muted-foreground">Eyebrow and title</p>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {loading ? (
            <>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </>
          ) : (
            <>
              <TextField
                id="who-we-are-page-eyebrow"
                label="Page eyebrow"
                value={form.eyebrow}
                onChange={(value) => updateForm((current) => ({ ...current, eyebrow: value }))}
                disabled={disabled}
              />
              <TextField
                id="who-we-are-page-title"
                label="Page title"
                value={form.title}
                onChange={(value) => updateForm((current) => ({ ...current, title: value }))}
                disabled={disabled}
              />
            </>
          )}
        </div>
      </section>

      {loading ? (
        <SectionsSkeleton />
      ) : form.sections.length === 0 ? (
        <div className="rounded-xl border py-16 text-center">
          <FileText className="mx-auto size-10 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium">No sections</p>
          <Button type="button" size="sm" className="mt-4" onClick={openAddSectionModal}>
            <Plus className="mr-2 size-4" />
            Add Section
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {form.sections.map((section, index) => (
            <SectionEditor
              key={section.id}
              section={section}
              sectionIndex={index}
              sectionCount={form.sections.length}
              disabled={disabled}
              onChange={(nextSection) => setSection(section.id, nextSection)}
              onEdit={() => setEditingSection(section)}
              onRemove={() => setDeleteTarget({
                id: section.id,
                label: section.title.trim() || `Section ${index + 1}`,
              })}
              onMoveUp={() => moveSection(index, -1)}
              onMoveDown={() => moveSection(index, 1)}
            />
          ))}
        </div>
      )}

      {addModalOpen && (
        <SectionContentModal
          mode="add"
          disabled={disabled}
          onClose={() => setAddModalOpen(false)}
          onSubmit={addSection}
        />
      )}

      {editingSection && (
        <SectionContentModal
          mode="edit"
          section={editingSection}
          disabled={disabled}
          onClose={() => setEditingSection(null)}
          onSubmit={(title, body) => updateSectionContent(editingSection.id, title, body)}
        />
      )}
      {deleteTarget && (
        <DestructiveConfirmModal
          title="Delete section?"
          description={
            <>
              Delete Who We Are section <strong>{deleteTarget.label}</strong>? This change will be
              auto-saved after confirmation.
            </>
          }
          confirmLabel="Confirm Delete"
          isWorking={saving}
          onConfirm={() => removeSection(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

function SectionContentModal({
  mode,
  section,
  disabled,
  onClose,
  onSubmit,
}: {
  mode: 'add' | 'edit'
  section?: AdminWhoWeAreSection
  disabled: boolean
  onClose: () => void
  onSubmit: (title: string, body: string) => void
}) {
  const [title, setTitle] = useState(section?.title ?? '')
  const [body, setBody] = useState(section?.body ?? '')
  const [error, setError] = useState<string | null>(null)
  const inputIdPrefix = `who-we-are-${mode}-section`
  const modalTitle = mode === 'edit' ? 'Edit Section' : 'Add Section'
  const submitLabel = mode === 'edit' ? 'Update Section' : 'Add Section'

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      document.getElementById(`${inputIdPrefix}-title`)?.focus()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [inputIdPrefix])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (disabled) return

    const nextTitle = title.trim()
    const nextBody = body.trim()

    if (!nextTitle) {
      setError('Section title is required.')
      return
    }

    if (!nextBody) {
      setError('Body text is required.')
      return
    }

    setError(null)
    onSubmit(nextTitle, nextBody)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={disabled ? undefined : onClose} />

      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${inputIdPrefix}-modal-title`}
        onSubmit={handleSubmit}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border bg-background shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
          <div>
            <h2 id={`${inputIdPrefix}-modal-title`} className="text-lg font-semibold">
              {modalTitle}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {mode === 'edit'
                ? 'Update this Who We Are page section.'
                : 'Add a section to the Who We Are page.'}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onClose} disabled={disabled}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <TextField
            id={`${inputIdPrefix}-title`}
            label="Section title"
            value={title}
            onChange={(value) => {
              setTitle(value)
              setError(null)
            }}
            disabled={disabled}
          />
          <TextareaField
            id={`${inputIdPrefix}-body`}
            label="Body text"
            value={body}
            onChange={(value) => {
              setBody(value)
              setError(null)
            }}
            rows={6}
            disabled={disabled}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={disabled}>
            Cancel
          </Button>
          <Button type="submit" disabled={disabled}>
            {mode === 'edit' ? <Save className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

function SectionEditor({
  section,
  sectionIndex,
  sectionCount,
  disabled,
  onChange,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  section: AdminWhoWeAreSection
  sectionIndex: number
  sectionCount: number
  disabled: boolean
  onChange: (section: AdminWhoWeAreSection) => void
  onEdit: () => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const sectionLabel = section.title.trim() || `Section ${sectionIndex + 1}`

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold">{sectionLabel}</h2>
            <Badge variant={section.isActive ? 'success' : 'secondary'}>
              {section.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Sort order {sectionIndex + 1}</p>
        </div>

        <div className="flex items-center gap-1">
          <IconButton
            label="Edit section"
            disabled={disabled}
            onClick={onEdit}
            icon={<Pencil className="size-4" />}
          />
          <IconButton
            label="Move section up"
            disabled={disabled || sectionIndex === 0}
            onClick={onMoveUp}
            icon={<ArrowUp className="size-4" />}
          />
          <IconButton
            label="Move section down"
            disabled={disabled || sectionIndex === sectionCount - 1}
            onClick={onMoveDown}
            icon={<ArrowDown className="size-4" />}
          />
          <IconButton
            label={section.isActive ? 'Deactivate section' : 'Activate section'}
            disabled={disabled}
            onClick={() => onChange({ ...section, isActive: !section.isActive })}
            icon={section.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          />
          <IconButton
            label="Delete section"
            disabled={disabled}
            onClick={onRemove}
            icon={<Trash2 className="size-4" />}
            danger
          />
        </div>
      </div>

      <div className="space-y-2 p-5">
        <p className="text-sm font-medium">Body text</p>
        <div className="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {section.body}
        </div>
      </div>
    </section>
  )
}

function IconButton({
  label,
  disabled,
  onClick,
  icon,
  danger = false,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  icon: React.ReactNode
  danger?: boolean
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={danger ? 'text-destructive hover:text-destructive' : undefined}
    >
      {icon}
    </Button>
  )
}

function TextField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  )
}

function TextareaField({
  id,
  label,
  value,
  onChange,
  rows,
  disabled,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  rows: number
  disabled: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        disabled={disabled}
        className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  )
}

function SectionsSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="space-y-4 p-5">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-36 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
