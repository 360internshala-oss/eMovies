import { useEffect, useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/utils/cn'
import { safeUrl } from '@/utils/url'

interface SmartImageProps {
  src?: string | null
  alt: string
  className?: string
  /** Applied to the wrapper (aspect ratio, rounding) */
  wrapperClassName?: string
  loading?: 'lazy' | 'eager'
  sizes?: string
  /** Show the monogram fallback instead of the icon */
  fallbackLabel?: string
  priority?: boolean
}

/**
 * Image with lazy loading, a deterministic gradient placeholder (derived from
 * the title so grids feel intentional), and a graceful failure state.
 */
export function SmartImage({
  src,
  alt,
  className,
  wrapperClassName,
  loading = 'lazy',
  sizes,
  fallbackLabel,
  priority = false,
}: SmartImageProps) {
  const [status, setStatus] = useState<'idle' | 'loaded' | 'error'>(src ? 'idle' : 'error')

  useEffect(() => {
    setStatus(src ? 'idle' : 'error')
  }, [src])

  const validSrc = safeUrl(src)
  const label = (fallbackLabel ?? alt ?? '?').trim()
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')

  // Deterministic hue from the label → consistent artwork-ish placeholder.
  const hue = Array.from(label).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 360, 7)

  return (
    <div className={cn('relative overflow-hidden bg-muted', wrapperClassName)}>
      <div
        aria-hidden="true"
        className={cn('absolute inset-0 transition-opacity duration-500', status === 'loaded' ? 'opacity-0' : 'opacity-100')}
        style={{
          backgroundImage: `radial-gradient(120% 120% at 20% 10%, hsl(${hue} 45% 24%) 0%, hsl(${(hue + 40) % 360} 35% 12%) 55%, hsl(var(--background)) 100%)`,
        }}
      >
        {status === 'error' ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-2 text-center">
            {initials ? (
              <span className="text-2xl font-bold tracking-tight text-white/75">{initials}</span>
            ) : (
              <ImageOff className="h-6 w-6 text-white/40" />
            )}
            <span className="line-clamp-2 text-[10px] font-medium leading-tight text-white/40">{label}</span>
          </div>
        ) : null}
      </div>

      {validSrc && status !== 'error' ? (
        <img
          src={validSrc}
          alt={alt}
          loading={priority ? 'eager' : loading}
          decoding="async"
          sizes={sizes}
          referrerPolicy="no-referrer"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={cn(
            'relative h-full w-full object-cover transition-all duration-500',
            status === 'loaded' ? 'opacity-100' : 'opacity-0',
            className,
          )}
        />
      ) : null}
    </div>
  )
}
