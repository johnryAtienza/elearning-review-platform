import { BookOpen } from 'lucide-react'
import { SubjectCard } from './SubjectCard'
import { Skeleton } from '@/components/ui/skeleton'
import type { Subject } from '../types'

interface SubjectListProps {
  subjects: Subject[]
  loading?: boolean
}

function SubjectCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <Skeleton className="h-44 rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <div className="flex gap-4 pt-2 border-t">
          <Skeleton className="h-3 w-20 mt-2" />
          <Skeleton className="h-3 w-16 mt-2" />
        </div>
      </div>
    </div>
  )
}

export function SubjectList({ subjects, loading = false }: SubjectListProps) {
  if (loading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SubjectCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <BookOpen className="size-7 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">No subjects found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filter.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {subjects.map((subject) => (
        <SubjectCard key={subject.id} subject={subject} />
      ))}
    </div>
  )
}
