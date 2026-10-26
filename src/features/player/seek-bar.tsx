import { useCallback, useRef, useState } from 'react'
import { cn } from '@/utils/cn'
import { formatTime } from '@/utils/format'

interface SeekBarProps {
  currentTime: number
  duration: number
  buffered: number
  onSeek: (time: number) => void
  onScrub: (scrubbing: boolean) => void
  className?: string
}

/**
 * Accessible seek bar: pointer drag, click-to-seek, keyboard arrows (5s),
 * Home/End. Uses a real range input for assistive tech and touch support.
 */
export function SeekBar({ currentTime, duration, buffered, onSeek, onScrub, className }: SeekBarProps) {
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  const percent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0
  const bufferedPercent = duration > 0 ? Math.min(100, Math.max(0, (buffered / duration) * 100)) : 0

  const timeFromEvent = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0 || duration <= 0) return 0
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      return ratio * duration
    },
    [duration],
  )

  return (
    <div className={cn('group/seek relative flex h-8 items-center sm:h-6', className)}>
      <div
        ref={trackRef}
        className="relative h-1.5 w-full cursor-pointer rounded-full bg-white/25 transition-[height] group-hover/seek:h-2"
        onMouseMove={(event) => duration > 0 && setHoverTime(timeFromEvent(event.clientX))}
        onMouseLeave={() => setHoverTime(null)}
      >
        <div className="absolute inset-y-0 left-0 rounded-full bg-white/30" style={{ width: `${bufferedPercent}%` }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${percent}%` }} />
        <div
          className={cn(
            'absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow transition-opacity',
            dragging ? 'opacity-100' : 'opacity-0 group-hover/seek:opacity-100',
          )}
          style={{ left: `${percent}%` }}
        />

        {hoverTime !== null && duration > 0 ? (
          <span
            className="pointer-events-none absolute -top-7 z-10 -translate-x-1/2 rounded bg-black/85 px-1.5 py-0.5 text-[11px] font-medium text-white"
            style={{ left: `${Math.min(96, Math.max(4, (hoverTime / duration) * 100))}%` }}
          >
            {formatTime(hoverTime)}
          </span>
        ) : null}

      </div>

      {/* Real range input, full-height so touch users get a comfortable target. */}
      <input
        type="range"
        min={0}
        max={Math.max(1, Math.floor(duration))}
        step={1}
        value={Math.floor(currentTime)}
        aria-label="Seek"
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
        onPointerDown={() => {
          setDragging(true)
          onScrub(true)
        }}
        onPointerUp={() => {
          setDragging(false)
          onScrub(false)
        }}
        onChange={(event) => onSeek(Number(event.target.value))}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') onSeek(Math.min(duration, currentTime + 5))
          if (event.key === 'ArrowLeft') onSeek(Math.max(0, currentTime - 5))
          if (event.key === 'Home') onSeek(0)
          if (event.key === 'End') onSeek(duration)
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  )
}
