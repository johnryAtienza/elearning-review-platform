import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, Loader2, Tag, Search, X, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tip, LoadError } from '@/features/admin/components/AdminTable'
import {
  getCategoriesWithCount,
  createCategory,
  updateCategory,
  deleteCategory,
  nameToSlug,
} from '@/services/categoriesApi'
import type { Category } from '@/features/categories/types'

// ── Main page ─────────────────────────────────────────────────────────────────

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [sortKey, setSortKey]       = useState<'name' | 'courseCount'>('name')
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('asc')

  // Modal state
  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState<Category | null>(null)

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await getCategoriesWithCount()
      setCategories(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  function openCreate() { setEditing(null); setModalOpen(true) }
  function openEdit(cat: Category) { setEditing(cat); setModalOpen(true) }

  function handleSaved(cat: Category) {
    setCategories((prev) => {
      const exists = prev.find((c) => c.id === cat.id)
      if (exists) return prev.map((c) => (c.id === cat.id ? { ...c, ...cat } : c))
      return [{ ...cat, courseCount: 0 }, ...prev]
    })
    setModalOpen(false)
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true)
    try {
      await deleteCategory(id)
      setCategories((prev) => prev.filter((c) => c.id !== id))
      setDeletingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category.')
    } finally {
      setDeleteLoading(false)
    }
  }

  function toggleSort(key: 'name' | 'courseCount') {
    if (sortKey === key) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')) }
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = categories
    .filter((c) =>
      !search.trim() ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      const mult = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'name') return mult * a.name.localeCompare(b.name)
      return mult * ((a.courseCount ?? 0) - (b.courseCount ?? 0))
    })

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? 'Loading…' : `${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}`}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="size-4" />
          New category
        </Button>
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search categories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-9"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* ── Error ── */}
      <LoadError message={error} />

      {/* ── Table ── */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <SortHeader label="Name" col="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Slug</th>
              <th className="hidden sm:table-cell px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
              <SortHeader label="Courses" col="courseCount" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right" />
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="hidden sm:table-cell px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-8 ml-auto" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-7 w-16 ml-auto" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Tag className="size-8 opacity-40" />
                    <p className="font-medium">
                      {search ? 'No categories match your search.' : 'No categories yet.'}
                    </p>
                    {!search && (
                      <Button size="sm" variant="outline" onClick={openCreate} className="gap-1.5">
                        <Plus className="size-3.5" />
                        Create first category
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((cat) => (
                <tr key={cat.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{cat.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{cat.slug}</td>
                  <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground max-w-xs truncate">
                    {cat.description ?? <span className="opacity-40">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{cat.courseCount ?? 0}</td>
                  <td className="px-4 py-3">
                    {deletingId === cat.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-muted-foreground hidden sm:inline">Delete?</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 px-2.5 text-xs"
                          disabled={deleteLoading}
                          onClick={() => handleDelete(cat.id)}
                        >
                          {deleteLoading ? <Loader2 className="size-3 animate-spin" /> : 'Confirm'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs"
                          disabled={deleteLoading}
                          onClick={() => setDeletingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <Tip label="Edit category">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => openEdit(cat)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        </Tip>
                        <Tip label="Delete category" align="right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletingId(cat.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </Tip>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Create / Edit modal ── */}
      {modalOpen && (
        <CategoryModal
          category={editing}
          existingNames={categories.filter((c) => c.id !== editing?.id).map((c) => c.name.toLowerCase())}
          existingSlugs={categories.filter((c) => c.id !== editing?.id).map((c) => c.slug.toLowerCase())}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

// ── Sort header ───────────────────────────────────────────────────────────────

function SortHeader({
  label, col, sortKey, sortDir, onSort, className = '',
}: {
  label: string
  col: 'name' | 'courseCount'
  sortKey: 'name' | 'courseCount'
  sortDir: 'asc' | 'desc'
  onSort: (col: 'name' | 'courseCount') => void
  className?: string
}) {
  const active = sortKey === col
  return (
    <th
      className={`px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors ${className}`}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className="flex flex-col">
          <ChevronUp   className={`size-2.5 -mb-0.5 ${active && sortDir === 'asc'  ? 'text-foreground' : 'opacity-30'}`} />
          <ChevronDown className={`size-2.5 ${active && sortDir === 'desc' ? 'text-foreground' : 'opacity-30'}`} />
        </span>
      </span>
    </th>
  )
}

// ── Category modal ────────────────────────────────────────────────────────────

interface CategoryModalProps {
  category: Category | null
  existingNames: string[]
  existingSlugs: string[]
  onClose: () => void
  onSaved: (cat: Category) => void
}

function CategoryModal({ category, existingNames, existingSlugs, onClose, onSaved }: CategoryModalProps) {
  const isEdit = category !== null

  const [name,        setName]        = useState(category?.name        ?? '')
  const [slug,        setSlug]        = useState(category?.slug        ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [slugEdited,  setSlugEdited]  = useState(isEdit)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const nameRef = useRef<HTMLInputElement>(null)
  useEffect(() => { nameRef.current?.focus() }, [])

  function handleNameChange(val: string) {
    setName(val)
    if (!slugEdited) setSlug(nameToSlug(val))
  }

  function validate(): string | null {
    if (!name.trim()) return 'Name is required.'
    if (!slug.trim()) return 'Slug is required.'
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return 'Slug must be lowercase letters, numbers, and hyphens only.'
    if (existingNames.includes(name.trim().toLowerCase())) return 'A category with this name already exists.'
    if (existingSlugs.includes(slug.trim().toLowerCase()))  return 'A category with this slug already exists.'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        await updateCategory(category.id, {
          name:        name.trim(),
          slug:        slug.trim(),
          description: description.trim() || undefined,
        })
        onSaved({ ...category, name: name.trim(), slug: slug.trim(), description: description.trim() || null })
      } else {
        const created = await createCategory({
          name:        name.trim(),
          slug:        slug.trim(),
          description: description.trim() || undefined,
        })
        onSaved(created)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-xl border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Category' : 'New Category'}
          </h2>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">

          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="cat-name" className="text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="cat-name"
              ref={nameRef}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Web Development"
              disabled={saving}
            />
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <label htmlFor="cat-slug" className="text-sm font-medium">
              Slug <span className="text-destructive">*</span>
            </label>
            <Input
              id="cat-slug"
              value={slug}
              onChange={(e) => { setSlugEdited(true); setSlug(e.target.value) }}
              placeholder="e.g. web-development"
              disabled={saving}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              URL-safe identifier. Auto-generated from name, but editable.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="cat-desc" className="text-sm font-medium">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              id="cat-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this category covers…"
              rows={2}
              disabled={saving}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Edge case note */}
          {isEdit && (
            <p className="text-xs text-muted-foreground rounded-md bg-muted/50 px-3 py-2">
              Deleting this category will not remove it from existing courses — those courses will simply become uncategorized.
            </p>
          )}

          {/* Error */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create category'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
