import { Check, ChevronRight } from 'lucide-react'
import { Dropdown, DropdownItem, DropdownLabel } from '@/components/ui/dropdown'
import { ASPECT_RATIOS, PLAYBACK_SPEEDS, type AspectRatio } from '@/config/app'
import { formatTime, formatBytes } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { DubTrack, Quality, SubtitleTrack } from '@/services/types'

const itemClass = 'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/10 focus-ring'

export function QualityMenu({
  qualities,
  active,
  autoLabel,
  onSelect,
}: {
  qualities: Quality[]
  active: number | 'auto'
  autoLabel: string
  onSelect: (value: number | 'auto') => void
}) {
  if (qualities.length === 0) return null
  return (
    <Dropdown
      align="right"
      label="Playback quality"
      trigger={({ toggle, open }) => (
        <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="menu" className="player-chip" aria-label="Playback quality">
          {active === 'auto' ? 'Auto' : `${active}p`}
        </button>
      )}
    >
      {({ close }) => (
        <>
          <DropdownLabel>Quality</DropdownLabel>
          <DropdownItem
            active={active === 'auto'}
            onSelect={() => {
              onSelect('auto')
              close()
            }}
            hint={autoLabel}
          >
            Auto
          </DropdownItem>
          {qualities.map((quality) => (
            <DropdownItem
              key={`${quality.id}-${quality.resolution}`}
              active={active === quality.resolution}
              onSelect={() => {
                onSelect(quality.resolution)
                close()
              }}
              hint={formatBytes(quality.sizeBytes) ?? undefined}
            >
              {quality.label}
              {quality.codec ? <span className="text-[10px] uppercase text-muted-foreground">{quality.codec}</span> : null}
            </DropdownItem>
          ))}
          <p className="px-3 py-2 text-[11px] leading-snug text-muted-foreground">
            Only renditions the API returned for this title are listed. DASH manifests exist but are not played in this build.
          </p>
        </>
      )}
    </Dropdown>
  )
}

export function SpeedMenu({ speed, onSelect }: { speed: number; onSelect: (value: number) => void }) {
  return (
    <Dropdown
      align="right"
      label="Playback speed"
      trigger={({ toggle, open }) => (
        <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="menu" className="player-chip" aria-label="Playback speed">
          {speed === 1 ? '1×' : `${speed}×`}
        </button>
      )}
    >
      {({ close }) => (
        <>
          <DropdownLabel>Speed</DropdownLabel>
          {PLAYBACK_SPEEDS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                onSelect(value)
                close()
              }}
              className={cn(itemClass, value === speed && 'text-primary')}
              role="menuitemradio"
              aria-checked={value === speed}
            >
              {value === 1 ? 'Normal' : `${value}×`}
              {value === speed ? <Check className="h-3.5 w-3.5" /> : null}
            </button>
          ))}
        </>
      )}
    </Dropdown>
  )
}

export function SubtitleMenu({
  tracks,
  activeCode,
  loading,
  onSelect,
}: {
  tracks: SubtitleTrack[]
  activeCode: string | null
  loading: boolean
  onSelect: (track: SubtitleTrack | null) => void
}) {
  return (
    <Dropdown
      align="right"
      label="Subtitles"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="menu"
          className={cn('player-chip', activeCode && 'player-chip-active')}
          aria-label={`Subtitles${activeCode ? ` (${activeCode})` : ' off'}`}
        >
          CC
        </button>
      )}
    >
      {({ close }) => (
        <>
          <DropdownLabel>Subtitles</DropdownLabel>
          <DropdownItem
            active={activeCode === null}
            onSelect={() => {
              onSelect(null)
              close()
            }}
          >
            Off
          </DropdownItem>
          {loading ? <p className="px-3 py-2 text-xs text-muted-foreground">Loading available tracks…</p> : null}
          {!loading && tracks.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No subtitle tracks were returned for this stream.</p>
          ) : null}
          {tracks.map((track) => (
            <DropdownItem
              key={track.id}
              active={activeCode === track.code}
              onSelect={() => {
                onSelect(track)
                close()
              }}
              hint={track.code.toUpperCase()}
            >
              {track.label}
            </DropdownItem>
          ))}
          <p className="px-3 py-2 text-[11px] leading-snug text-muted-foreground">
            Tracks come from the API's caption endpoint and are converted to WebVTT in your browser.
          </p>
        </>
      )}
    </Dropdown>
  )
}

export function AudioMenu({
  dubs,
  activeLabel,
  onSelect,
}: {
  dubs: DubTrack[]
  activeLabel: string
  onSelect: (track: DubTrack) => void
}) {
  const audioTracks = dubs.filter((track) => track.kind === 'audio')
  const subtitleVariants = dubs.filter((track) => track.kind === 'subtitle')

  return (
    <Dropdown
      align="right"
      label="Audio tracks"
      trigger={({ toggle, open }) => (
        <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="menu" className="player-chip" aria-label="Audio language">
          {activeLabel.slice(0, 3).toLowerCase() === 'ori' ? 'Audio' : activeLabel.split(' ')[0]}
        </button>
      )}
    >
      {({ close }) => (
        <>
          <DropdownLabel>Audio</DropdownLabel>
          {audioTracks.map((track) => (
            <DropdownItem
              key={`${track.detailPath}-${track.label}`}
              active={track.label === activeLabel}
              onSelect={() => {
                onSelect(track)
                close()
              }}
              hint={track.code?.toUpperCase()}
            >
              {track.original ? 'Original audio' : track.label}
            </DropdownItem>
          ))}
          {audioTracks.length <= 1 ? (
            <p className="px-3 py-2 text-[11px] leading-snug text-muted-foreground">
              No dubbed audio variants were returned for this title.
            </p>
          ) : null}

          {subtitleVariants.length > 0 ? (
            <>
              <DropdownLabel>Subtitle variants</DropdownLabel>
              {subtitleVariants.map((track) => (
                <DropdownItem
                  key={`${track.detailPath}-${track.label}`}
                  onSelect={() => {
                    onSelect(track)
                    close()
                  }}
                  hint={track.code?.toUpperCase()}
                >
                  {track.label}
                </DropdownItem>
              ))}
            </>
          ) : null}

          <p className="px-3 py-2 text-[11px] leading-snug text-muted-foreground">
            Dub tracks are separate catalogue entries; selecting one reloads the stream with that language.
          </p>
        </>
      )}
    </Dropdown>
  )
}

export function AspectMenu({ value, onSelect }: { value: AspectRatio; onSelect: (value: AspectRatio) => void }) {
  const labels: Record<AspectRatio, string> = {
    default: 'Fit (contain)',
    '16:9': '16:9 frame',
    '4:3': '4:3 frame',
    fill: 'Stretch to fill',
    cover: 'Crop to fill',
  }
  return (
    <Dropdown
      align="right"
      label="Aspect ratio"
      trigger={({ toggle, open }) => (
        <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="menu" className="player-chip" aria-label="Aspect ratio">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    >
      {({ close }) => (
        <>
          <DropdownLabel>Aspect ratio</DropdownLabel>
          {ASPECT_RATIOS.map((ratio) => (
            <DropdownItem
              key={ratio}
              active={ratio === value}
              onSelect={() => {
                onSelect(ratio)
                close()
              }}
            >
              {labels[ratio]}
            </DropdownItem>
          ))}
        </>
      )}
    </Dropdown>
  )
}

export function EpisodeMenu({
  seasons,
  season,
  episode,
  hasEpisodes,
  onSelect,
}: {
  seasons: number[]
  season: number
  episode: number
  hasEpisodes: boolean
  onSelect: (season: number, episode: number) => void
}) {
  return (
    <Dropdown
      align="right"
      label="Episodes"
      trigger={({ toggle, open }) => (
        <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="menu" className="player-chip" aria-label="Choose episode">
          E{episode}
        </button>
      )}
    >
      {({ close }) => (
        <>
          <DropdownLabel>Episode</DropdownLabel>
          {seasons.length > 0 ? (
            <div className="px-3 pb-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Season</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {seasons.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      onSelect(value, 1)
                      close()
                    }}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs',
                      value === season ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="px-3 pb-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Episode number</span>
            <div className="mt-1 grid grid-cols-6 gap-1">
              {Array.from({ length: 24 }).map((_, index) => {
                const value = index + 1
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      onSelect(season || 1, value)
                      close()
                    }}
                    className={cn(
                      'rounded-md border py-1 text-xs',
                      value === episode ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
          </div>
          {!hasEpisodes ? (
            <p className="px-3 py-2 text-[11px] leading-snug text-muted-foreground">
              The API does not publish an episode list. Episodes are resolved on demand — if an episode has no stream, you will be told
              instead of being shown a fake page.
            </p>
          ) : null}
        </>
      )}
    </Dropdown>
  )
}

export function TrailerButton({ url }: { url: string | null }) {
  if (!url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="player-chip"
      aria-label="Watch trailer"
      title={`Trailer · ${formatTime(0).replace('0:00', 'SD')}`}
    >
      Trailer
    </a>
  )
}
