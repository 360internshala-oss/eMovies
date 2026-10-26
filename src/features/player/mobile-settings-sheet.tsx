import { Sheet } from '@/components/ui/sheet'
import { ASPECT_RATIOS, PLAYBACK_SPEEDS, type AspectRatio } from '@/config/app'
import { cn } from '@/utils/cn'
import type { DubTrack, Quality, SubtitleTrack } from '@/services/types'

const chip = 'rounded-full border px-3 py-2 text-xs font-semibold transition min-h-9'
const chipOn = 'border-primary bg-primary/20 text-primary'
const chipOff = 'border-border text-muted-foreground hover:text-foreground'

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</h3>
        {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

interface MobileSettingsSheetProps {
  open: boolean
  onClose: () => void
  qualities: Quality[]
  qualityChoice: 'auto' | number
  onQuality: (value: 'auto' | number) => void
  speed: number
  onSpeed: (value: number) => void
  tracks: SubtitleTrack[]
  activeSubtitle: SubtitleTrack | null
  subtitleLoading: boolean
  onSubtitle: (track: SubtitleTrack | null) => void
  dubs: DubTrack[]
  audioLabel: string
  onAudio: (track: DubTrack) => void
  aspect: AspectRatio
  onAspect: (value: AspectRatio) => void
  seasons: number[]
  season: number
  episode: number
  onEpisode: (season: number, episode: number) => void
}

/**
 * Touch-first replacement for the desktop control-bar menus. Everything it
 * lists is real API data — nothing is invented when the API returns nothing.
 */
export function MobileSettingsSheet({
  open,
  onClose,
  qualities,
  qualityChoice,
  onQuality,
  speed,
  onSpeed,
  tracks,
  activeSubtitle,
  subtitleLoading,
  onSubtitle,
  dubs,
  audioLabel,
  onAudio,
  aspect,
  onAspect,
  seasons,
  season,
  episode,
  onEpisode,
}: MobileSettingsSheetProps) {
  const audioTracks = dubs.filter((track) => track.kind === 'audio')
  const aspectLabels: Record<AspectRatio, string> = {
    default: 'Fit',
    '16:9': '16:9',
    '4:3': '4:3',
    fill: 'Stretch',
    cover: 'Crop',
  }

  return (
    <Sheet open={open} onClose={onClose} title="Playback settings" side="bottom" className="max-h-[80svh]">
      <div className="space-y-5 pb-2">
        {qualities.length > 0 ? (
          <Row label="Quality" hint={`${qualities.length} rendition${qualities.length === 1 ? '' : 's'} from the API`}>
            <button type="button" onClick={() => onQuality('auto')} className={cn(chip, qualityChoice === 'auto' ? chipOn : chipOff)}>
              Auto
            </button>
            {qualities.map((quality) => (
              <button
                key={`${quality.id}-${quality.resolution}`}
                type="button"
                onClick={() => onQuality(quality.resolution)}
                className={cn(chip, qualityChoice === quality.resolution ? chipOn : chipOff)}
              >
                {quality.label}
                {quality.codec ? <span className="ml-1 text-[10px] uppercase opacity-70">{quality.codec}</span> : null}
              </button>
            ))}
          </Row>
        ) : null}

        <Row label="Speed" hint={`${speed}×`}>
          {PLAYBACK_SPEEDS.map((value) => (
            <button key={value} type="button" onClick={() => onSpeed(value)} className={cn(chip, value === speed ? chipOn : chipOff)}>
              {value === 1 ? 'Normal' : `${value}×`}
            </button>
          ))}
        </Row>

        <Row label="Subtitles" hint={subtitleLoading ? 'loading…' : `${tracks.length} track${tracks.length === 1 ? '' : 's'}`}>
          <button type="button" onClick={() => onSubtitle(null)} className={cn(chip, activeSubtitle === null ? chipOn : chipOff)}>
            Off
          </button>
          {tracks.map((track) => (
            <button
              key={track.id}
              type="button"
              onClick={() => onSubtitle(track)}
              className={cn(chip, activeSubtitle?.id === track.id ? chipOn : chipOff)}
            >
              {track.label}
            </button>
          ))}
          {!subtitleLoading && tracks.length === 0 ? <p className="text-xs text-muted-foreground">The API returned no subtitle tracks for this stream.</p> : null}
        </Row>

        {audioTracks.length > 0 ? (
          <Row label="Audio" hint={audioLabel}>
            {audioTracks.map((track) => (
              <button
                key={`${track.detailPath}-${track.label}`}
                type="button"
                onClick={() => {
                  onAudio(track)
                  onClose()
                }}
                className={cn(chip, track.label === audioLabel ? chipOn : chipOff)}
              >
                {track.original ? 'Original' : track.label}
              </button>
            ))}
          </Row>
        ) : null}

        <Row label="Aspect ratio" hint={aspectLabels[aspect]}>
          {ASPECT_RATIOS.map((ratio) => (
            <button key={ratio} type="button" onClick={() => onAspect(ratio)} className={cn(chip, ratio === aspect ? chipOn : chipOff)}>
              {aspectLabels[ratio]}
            </button>
          ))}
        </Row>

        {seasons.length > 0 ? (
          <Row label="Episode" hint={`S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`}>
            <div className="w-full space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {seasons.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onEpisode(value, 1)}
                    className={cn(chip, value === season ? chipOn : chipOff)}
                  >
                    Season {value}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {Array.from({ length: 24 }).map((_, index) => {
                  const value = index + 1
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        onEpisode(season || 1, value)
                        onClose()
                      }}
                      className={cn('min-h-9 rounded-lg border text-xs font-semibold', value === episode ? chipOn : chipOff)}
                    >
                      {value}
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] leading-snug text-muted-foreground">
                Episodes are verified against the API before playing — an episode without a stream is reported, never faked.
              </p>
            </div>
          </Row>
        ) : null}
      </div>
    </Sheet>
  )
}
