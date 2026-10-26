import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton rounded-lg', className)} aria-hidden="true" {...props} />
}

export function PosterSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('w-full space-y-2', className)}>
      <Skeleton className="aspect-[2/3] w-full rounded-xl" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

export function RailSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-hidden px-4 lg:px-8" aria-busy="true" aria-label="Loading content">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="w-[42vw] shrink-0 sm:w-44 lg:w-48">
          <PosterSkeleton />
        </div>
      ))}
    </div>
  )
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" aria-busy="true" aria-label="Loading titles">
      {Array.from({ length: count }).map((_, index) => (
        <PosterSkeleton key={index} />
      ))}
    </div>
  )
}
