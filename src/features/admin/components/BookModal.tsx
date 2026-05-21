import { useState, useRef } from 'react'
import { X, Upload, ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { uploadToStorage } from '@/services/storageClient'
import { storagePaths } from '@/services/storagePaths'
import {
  createAdminBook,
  updateAdminBook,
  type AdminBook,
} from '@/services/admin.service'
import { UPLOAD_LIMITS } from '@/constants/upload'
import { cn } from '@/utils/cn'

interface BookModalProps {
  /** null = create mode, non-null = edit mode */
  book: AdminBook | null
  onClose: () => void
  onSaved: (book: AdminBook) => void
}

export function BookModal({ book, onClose, onSaved }: BookModalProps) {
  const isEdit = book !== null

  const [title,         setTitle]         = useState(book?.title       ?? '')
  const [author,        setAuthor]        = useState(book?.author      ?? '')
  const [isbn,          setIsbn]          = useState(book?.isbn        ?? '')
  const [description,   setDescription]   = useState(book?.description ?? '')
  // Price input is in PHP (decimal); converted to centavos on submit.
  const [pricePhp,      setPricePhp]      = useState<string>(
    book ? (book.priceCentavos / 100).toFixed(2) : ''
  )
  const [stock,         setStock]         = useState<number>(book?.stock ?? 0)
  const [status,        setStatus]        = useState<'draft' | 'published' | 'archived'>(book?.status ?? 'draft')
  const [coverFile,     setCoverFile]     = useState<File | null>(null)
  const [coverPreview,  setCoverPreview]  = useState<string | null>(book?.coverUrl ?? null)
  const [saving,        setSaving]        = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error,         setError]         = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > UPLOAD_LIMITS.IMAGE) {
      setError('Image must be under 5 MB.')
      return
    }
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    const trimmedTitle = title.trim()
    if (!trimmedTitle) { setError('Title is required.'); return }

    const priceFloat = Number.parseFloat(pricePhp)
    if (!Number.isFinite(priceFloat) || priceFloat < 0) {
      setError('Price must be a non-negative number.')
      return
    }
    const priceCentavos = Math.round(priceFloat * 100)

    if (!Number.isInteger(stock) || stock < 0) {
      setError('Stock must be a non-negative integer.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // 1. Create or update book record
      let bookId = book?.id
      if (isEdit) {
        await updateAdminBook(book.id, {
          title:         trimmedTitle,
          author:        author.trim(),
          isbn:          isbn.trim() || null,
          description:   description.trim(),
          priceCentavos,
          stock,
          status,
        })
      } else {
        bookId = await createAdminBook({
          title:         trimmedTitle,
          author:        author.trim(),
          isbn:          isbn.trim() || null,
          description:   description.trim(),
          priceCentavos,
          stock,
          status,
        })
      }

      // 2. Upload cover if a new file was picked
      let coverUrl = book?.coverUrl ?? null
      if (coverFile && bookId) {
        const ext    = coverFile.name.split('.').pop() ?? 'webp'
        const path   = storagePaths.bookCover(bookId, ext)
        const result = await uploadToStorage(coverFile, path, (evt) => {
          setUploadProgress(evt.percent)
        })
        // Store the public CDN URL (matches courseThumbnail pattern).
        coverUrl = result.publicUrl
        await updateAdminBook(bookId, { coverUrl })
      }

      onSaved({
        id:            bookId!,
        title:         trimmedTitle,
        author:        author.trim(),
        isbn:          isbn.trim() || null,
        description:   description.trim(),
        coverUrl,
        priceCentavos,
        stock,
        status,
        createdAt:     book?.createdAt ?? new Date().toISOString(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save book.')
    } finally {
      setSaving(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={saving ? undefined : onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-xl border bg-background shadow-xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Book' : 'New Book'}
          </h2>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="space-y-5 px-6 py-5">

            {/* Cover picker */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cover</label>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                className={cn(
                  'relative flex h-44 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors',
                  coverPreview
                    ? 'border-transparent'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50',
                )}
              >
                {coverPreview ? (
                  <>
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="absolute inset-0 size-full object-cover"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                      <Upload className="size-5 text-white" />
                      <span className="text-xs font-medium text-white">Change cover</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImageIcon className="size-8" />
                    <p className="text-center text-xs">
                      Click to upload
                      <br />
                      <span className="text-muted-foreground/60">JPG, PNG, WebP · max 5 MB</span>
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label htmlFor="book-title" className="text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                id="book-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Engineering Mathematics Reviewer"
                disabled={saving}
              />
            </div>

            {/* Author */}
            <div className="space-y-1.5">
              <label htmlFor="book-author" className="text-sm font-medium">
                Author
              </label>
              <Input
                id="book-author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Author name"
                disabled={saving}
              />
            </div>

            {/* ISBN */}
            <div className="space-y-1.5">
              <label htmlFor="book-isbn" className="text-sm font-medium">
                ISBN
              </label>
              <Input
                id="book-isbn"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="Optional"
                disabled={saving}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="book-desc" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="book-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description shown on the catalog and detail page."
                rows={3}
                disabled={saving}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Price + Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="book-price" className="text-sm font-medium">
                  Price (PHP) <span className="text-destructive">*</span>
                </label>
                <Input
                  id="book-price"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  value={pricePhp}
                  onChange={(e) => setPricePhp(e.target.value)}
                  placeholder="500.00"
                  disabled={saving}
                />
                <p className="text-[11px] text-muted-foreground">Stored in centavos.</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="book-stock" className="text-sm font-medium">
                  Stock
                </label>
                <Input
                  id="book-stock"
                  type="number"
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(Math.max(0, Number(e.target.value) || 0))}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label htmlFor="book-status" className="text-sm font-medium">Status</label>
              <select
                id="book-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                disabled={saving}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="draft">Draft — not visible to customers</option>
                <option value="published">Published — visible to customers</option>
                <option value="archived">Archived — hidden, retained for orders</option>
              </select>
            </div>

            {/* Upload progress bar */}
            {saving && uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uploading cover…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          {/* Actions */}
          <div className="shrink-0 flex justify-end gap-2 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create book'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
