import { PosterCard } from './poster-card'
import { cn } from '@/utils/cn'
import type { Title } from '@/services/types'

export function ContentGrid({ items, className }: { items: Title[]; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6', className)}>
      {items.map((item, index) => (
        <PosterCard
          key={`${item.detailPath}-${item.season}`}
          title={item}
          width="grid"
          priority={index < 6}
          subtitle={item.genres.slice(0, 2).join(' · ') || item.country || undefined}
        />
      ))}
    </div>
  )
}
