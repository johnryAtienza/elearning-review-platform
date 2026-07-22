import { useEffect, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Package,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '../../features/admin/components/AdminTable'
import { toast } from '@/lib/toast'
import {
  getAdminReviewClassesContent,
  saveAdminReviewClassesContent,
  type AdminReviewClassesContent,
  type AdminReviewPackage,
  type AdminReviewPackageFeature,
  type AdminReviewPackageOption,
} from '@s-class/api/admin.service'

const EMPTY_CONTENT: AdminReviewClassesContent = {
  eyebrow: '',
  heading: '',
  packages: [],
}

function newId(): string {
  return crypto.randomUUID()
}

function createFeature(sortOrder: number): AdminReviewPackageFeature {
  return {
    id: newId(),
    featureText: '',
    sortOrder,
  }
}

function createOption(sortOrder: number): AdminReviewPackageOption {
  return {
    id: newId(),
    title: '',
    price: '',
    sortOrder,
    isActive: true,
    features: [createFeature(0)],
  }
}

function createPackage(sortOrder: number): AdminReviewPackage {
  return {
    id: newId(),
    title: '',
    description: '',
    badge: null,
    price: '',
    onlineAccessMonths: 6,
    sortOrder,
    isActive: true,
    features: [createFeature(0)],
    options: [],
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

function normalizeFeatures(features: AdminReviewPackageFeature[]): AdminReviewPackageFeature[] {
  return features
    .map((feature) => ({ ...feature, featureText: feature.featureText.trim() }))
    .filter((feature) => feature.featureText.length > 0)
    .map((feature, sortOrder) => ({ ...feature, sortOrder }))
}

function normalizeForSave(content: AdminReviewClassesContent): AdminReviewClassesContent {
  return {
    eyebrow: content.eyebrow.trim(),
    heading: content.heading.trim(),
    packages: content.packages.map((pkg, packageIndex) => ({
      ...pkg,
      title: pkg.title.trim(),
      description: pkg.description.trim(),
      badge: pkg.badge?.trim() || null,
      price: pkg.price?.trim() || null,
      onlineAccessMonths: Math.trunc(pkg.onlineAccessMonths),
      sortOrder: packageIndex,
      features: normalizeFeatures(pkg.features),
      options: pkg.options.map((option, optionIndex) => ({
        ...option,
        title: option.title.trim(),
        price: option.price.trim(),
        sortOrder: optionIndex,
        features: normalizeFeatures(option.features),
      })),
    })),
  }
}

function validate(content: AdminReviewClassesContent): string | null {
  if (!content.eyebrow) return 'Section eyebrow is required.'
  if (!content.heading) return 'Section heading is required.'

  for (const [packageIndex, pkg] of content.packages.entries()) {
    const label = pkg.title || `Package ${packageIndex + 1}`
    if (!pkg.title) return `${label} needs a title.`
    if (!Number.isInteger(pkg.onlineAccessMonths) || pkg.onlineAccessMonths < 1) {
      return `${label} needs a valid online access duration.`
    }
    if (!pkg.price && pkg.options.length === 0) {
      return `${label} needs a package price or at least one option.`
    }

    for (const [optionIndex, option] of pkg.options.entries()) {
      const optionLabel = option.title || `${label} option ${optionIndex + 1}`
      if (!option.title) return `${optionLabel} needs a title.`
      if (!option.price) return `${optionLabel} needs a price.`
    }
  }

  return null
}

export function AdminReviewPackagesPage() {
  const [form, setForm] = useState<AdminReviewClassesContent>(EMPTY_CONTENT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setLoadError(null)
    getAdminReviewClassesContent()
      .then((content) => {
        if (!cancelled) {
          setForm(content)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load review packages.')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [])

  function updateForm(updater: (current: AdminReviewClassesContent) => AdminReviewClassesContent) {
    setForm(updater)
    setSaveError(null)
    setSuccess(null)
  }

  function setPackage(packageId: string, nextPackage: AdminReviewPackage) {
    updateForm((current) => ({
      ...current,
      packages: current.packages.map((pkg) => pkg.id === packageId ? nextPackage : pkg),
    }))
  }

  function addPackage() {
    updateForm((current) => ({
      ...current,
      packages: [...current.packages, createPackage(current.packages.length)],
    }))
  }

  function removePackage(packageId: string) {
    updateForm((current) => ({
      ...current,
      packages: current.packages.filter((pkg) => pkg.id !== packageId),
    }))
  }

  function movePackage(index: number, direction: -1 | 1) {
    updateForm((current) => ({
      ...current,
      packages: moveItem(current.packages, index, direction),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    const normalized = normalizeForSave(form)
    const validationError = validate(normalized)
    if (validationError) {
      setSaveError(validationError)
      setSuccess(null)
      return
    }

    setSaving(true)
    setSaveError(null)
    setSuccess(null)

    try {
      const saved = await saveAdminReviewClassesContent(normalized)
      setForm(saved)
      setSuccess('Review packages saved.')
      toast.success('Review packages saved.')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save review packages.')
    } finally {
      setSaving(false)
    }
  }

  const disabled = loading || saving
  const activeCount = form.packages.filter((pkg) => pkg.isActive).length

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reviewer Packages</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? 'Loading...' : `${form.packages.length} total / ${activeCount} active`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={addPackage} disabled={disabled}>
            <Plus className="mr-2 size-4" />
            Package
          </Button>
          <Button type="submit" disabled={disabled}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            {saving ? 'Saving...' : 'Save'}
          </Button>
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
            <Package className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Section Copy</h2>
            <p className="text-xs text-muted-foreground">Landing page heading</p>
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
              <div className="space-y-1.5">
                <label htmlFor="review-eyebrow" className="text-sm font-medium">Eyebrow</label>
                <Input
                  id="review-eyebrow"
                  value={form.eyebrow}
                  onChange={(e) => updateForm((current) => ({ ...current, eyebrow: e.target.value }))}
                  disabled={disabled}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="review-heading" className="text-sm font-medium">Heading</label>
                <Input
                  id="review-heading"
                  value={form.heading}
                  onChange={(e) => updateForm((current) => ({ ...current, heading: e.target.value }))}
                  disabled={disabled}
                />
              </div>
            </>
          )}
        </div>
      </section>

      {loading ? (
        <PackagesSkeleton />
      ) : form.packages.length === 0 ? (
        <div className="rounded-xl border py-16 text-center">
          <Package className="mx-auto size-10 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium">No review packages</p>
          <Button type="button" size="sm" className="mt-4" onClick={addPackage}>
            <Plus className="mr-2 size-4" />
            Package
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {form.packages.map((pkg, index) => (
            <PackageEditor
              key={pkg.id}
              pkg={pkg}
              packageIndex={index}
              packageCount={form.packages.length}
              disabled={disabled}
              onChange={(nextPackage) => setPackage(pkg.id, nextPackage)}
              onRemove={() => removePackage(pkg.id)}
              onMoveUp={() => movePackage(index, -1)}
              onMoveDown={() => movePackage(index, 1)}
            />
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={disabled}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  )
}

interface PackageEditorProps {
  pkg: AdminReviewPackage
  packageIndex: number
  packageCount: number
  disabled: boolean
  onChange: (pkg: AdminReviewPackage) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function PackageEditor({
  pkg,
  packageIndex,
  packageCount,
  disabled,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: PackageEditorProps) {
  const packageLabel = pkg.title.trim() || `Package ${packageIndex + 1}`

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold">{packageLabel}</h2>
            <Badge variant={pkg.isActive ? 'success' : 'secondary'}>
              {pkg.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Sort order {packageIndex + 1}</p>
        </div>

        <div className="flex items-center gap-1">
          <IconButton
            label="Move package up"
            disabled={disabled || packageIndex === 0}
            onClick={onMoveUp}
            icon={<ArrowUp className="size-4" />}
          />
          <IconButton
            label="Move package down"
            disabled={disabled || packageIndex === packageCount - 1}
            onClick={onMoveDown}
            icon={<ArrowDown className="size-4" />}
          />
          <IconButton
            label={pkg.isActive ? 'Deactivate package' : 'Activate package'}
            disabled={disabled}
            onClick={() => onChange({ ...pkg, isActive: !pkg.isActive })}
            icon={pkg.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          />
          <IconButton
            label="Delete package"
            disabled={disabled}
            onClick={onRemove}
            icon={<Trash2 className="size-4" />}
            danger
          />
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_12rem_10rem]">
          <div className="space-y-1.5">
            <label htmlFor={`package-title-${pkg.id}`} className="text-sm font-medium">Title</label>
            <Input
              id={`package-title-${pkg.id}`}
              value={pkg.title}
              onChange={(e) => onChange({ ...pkg, title: e.target.value })}
              disabled={disabled}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`package-price-${pkg.id}`} className="text-sm font-medium">Price</label>
            <Input
              id={`package-price-${pkg.id}`}
              value={pkg.price ?? ''}
              onChange={(e) => onChange({ ...pkg, price: e.target.value })}
              placeholder="Php x,xxx"
              disabled={disabled}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`package-months-${pkg.id}`} className="text-sm font-medium">Access months</label>
            <Input
              id={`package-months-${pkg.id}`}
              type="number"
              min={1}
              value={pkg.onlineAccessMonths}
              onChange={(e) => onChange({ ...pkg, onlineAccessMonths: Number(e.target.value) || 0 })}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
          <div className="space-y-1.5">
            <label htmlFor={`package-description-${pkg.id}`} className="text-sm font-medium">Description</label>
            <textarea
              id={`package-description-${pkg.id}`}
              value={pkg.description}
              onChange={(e) => onChange({ ...pkg, description: e.target.value })}
              rows={3}
              disabled={disabled}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`package-badge-${pkg.id}`} className="text-sm font-medium">Badge</label>
            <Input
              id={`package-badge-${pkg.id}`}
              value={pkg.badge ?? ''}
              onChange={(e) => onChange({ ...pkg, badge: e.target.value })}
              placeholder="Most Complete"
              disabled={disabled}
            />
          </div>
        </div>

        <FeatureList
          title="Package Features"
          features={pkg.features}
          disabled={disabled}
          onChange={(features) => onChange({ ...pkg, features })}
        />

        <OptionsList
          options={pkg.options}
          disabled={disabled}
          onChange={(options) => onChange({ ...pkg, options })}
        />
      </div>
    </section>
  )
}

interface OptionsListProps {
  options: AdminReviewPackageOption[]
  disabled: boolean
  onChange: (options: AdminReviewPackageOption[]) => void
}

function OptionsList({ options, disabled, onChange }: OptionsListProps) {
  function setOption(optionId: string, nextOption: AdminReviewPackageOption) {
    onChange(options.map((option) => option.id === optionId ? nextOption : option))
  }

  return (
    <div className="space-y-3 border-t pt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Package Options</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange([...options, createOption(options.length)])}
        >
          <Plus className="mr-2 size-4" />
          Option
        </Button>
      </div>

      {options.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
          No options
        </p>
      ) : (
        <div className="space-y-3">
          {options.map((option, optionIndex) => (
            <div key={option.id} className="rounded-lg border bg-background/40 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={option.isActive ? 'success' : 'secondary'}>
                    {option.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Option {optionIndex + 1}</span>
                </div>

                <div className="flex items-center gap-1">
                  <IconButton
                    label="Move option up"
                    disabled={disabled || optionIndex === 0}
                    onClick={() => onChange(moveItem(options, optionIndex, -1))}
                    icon={<ArrowUp className="size-4" />}
                  />
                  <IconButton
                    label="Move option down"
                    disabled={disabled || optionIndex === options.length - 1}
                    onClick={() => onChange(moveItem(options, optionIndex, 1))}
                    icon={<ArrowDown className="size-4" />}
                  />
                  <IconButton
                    label={option.isActive ? 'Deactivate option' : 'Activate option'}
                    disabled={disabled}
                    onClick={() => setOption(option.id, { ...option, isActive: !option.isActive })}
                    icon={option.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  />
                  <IconButton
                    label="Delete option"
                    disabled={disabled}
                    onClick={() => onChange(options.filter((item) => item.id !== option.id))}
                    icon={<Trash2 className="size-4" />}
                    danger
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_12rem]">
                <div className="space-y-1.5">
                  <label htmlFor={`option-title-${option.id}`} className="text-sm font-medium">Option title</label>
                  <Input
                    id={`option-title-${option.id}`}
                    value={option.title}
                    onChange={(e) => setOption(option.id, { ...option, title: e.target.value })}
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={`option-price-${option.id}`} className="text-sm font-medium">Option price</label>
                  <Input
                    id={`option-price-${option.id}`}
                    value={option.price}
                    onChange={(e) => setOption(option.id, { ...option, price: e.target.value })}
                    placeholder="Php x,xxx"
                    disabled={disabled}
                  />
                </div>
              </div>

              <div className="mt-4">
                <FeatureList
                  title="Option Features"
                  features={option.features}
                  disabled={disabled}
                  onChange={(features) => setOption(option.id, { ...option, features })}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface FeatureListProps {
  title: string
  features: AdminReviewPackageFeature[]
  disabled: boolean
  onChange: (features: AdminReviewPackageFeature[]) => void
}

function FeatureList({ title, features, disabled, onChange }: FeatureListProps) {
  function setFeature(featureId: string, featureText: string) {
    onChange(features.map((feature) =>
      feature.id === featureId ? { ...feature, featureText } : feature,
    ))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange([...features, createFeature(features.length)])}
        >
          <Plus className="mr-2 size-4" />
          Feature
        </Button>
      </div>

      {features.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
          No features
        </p>
      ) : (
        <div className="space-y-2">
          {features.map((feature, featureIndex) => (
            <div key={feature.id} className="flex items-center gap-2">
              <Input
                value={feature.featureText}
                onChange={(e) => setFeature(feature.id, e.target.value)}
                disabled={disabled}
              />
              <IconButton
                label="Move feature up"
                disabled={disabled || featureIndex === 0}
                onClick={() => onChange(moveItem(features, featureIndex, -1))}
                icon={<ArrowUp className="size-4" />}
              />
              <IconButton
                label="Move feature down"
                disabled={disabled || featureIndex === features.length - 1}
                onClick={() => onChange(moveItem(features, featureIndex, 1))}
                icon={<ArrowDown className="size-4" />}
              />
              <IconButton
                label="Delete feature"
                disabled={disabled}
                onClick={() => onChange(features.filter((item) => item.id !== feature.id))}
                icon={<Trash2 className="size-4" />}
                danger
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface IconButtonProps {
  label: string
  icon: React.ReactNode
  disabled?: boolean
  danger?: boolean
  onClick: () => void
}

function IconButton({ label, icon, disabled, danger = false, onClick }: IconButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={danger ? 'size-8 text-destructive hover:bg-destructive/10 hover:text-destructive' : 'size-8'}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </Button>
  )
}

function PackagesSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-36" />
          </div>
          <div className="space-y-4 p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_12rem_10rem]">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
