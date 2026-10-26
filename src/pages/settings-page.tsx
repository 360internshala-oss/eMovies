import { Monitor, Moon, RotateCcw, Sun, Trash2 } from 'lucide-react'
import { APP, SUBTITLE_LANGUAGES, type AspectRatio } from '@/config/app'
import { useSettings } from '@/store/settings'
import { useLibrary } from '@/store/library'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageHeader } from '@/components/layout/page-header'
import { Switch } from '@/components/ui/switch'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Link } from '@/router/Link'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/utils/cn'
import type { QualityPreference } from '@/store/settings'

const ASPECTS: { value: AspectRatio; label: string }[] = [
  { value: 'default', label: 'Fit (contain)' },
  { value: 'cover', label: 'Crop to fill' },
  { value: 'fill', label: 'Stretch' },
]

export function SettingsPage() {
  useDocumentTitle('Settings')
  const { settings, update, reset } = useSettings()
  const { state, clearHistory } = useLibrary()
  const { push } = useToast()

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-20 lg:pt-24">
      <PageHeader eyebrow="Preferences" title="Settings" description="These preferences live in this browser. Nothing is sent to a server." />

      <section className="rounded-2xl border border-border bg-white/[0.02] p-4">
        <h2 className="mb-1 text-sm font-semibold">Appearance</h2>
        <p className="mb-3 text-xs text-muted-foreground">Choose a theme. System follows your device setting.</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
          {(
            [
              { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
              { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
              { value: 'system', label: 'System', icon: <Monitor className="h-4 w-4" /> },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={settings.theme === option.value}
              onClick={() => update({ theme: option.value })}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-semibold transition',
                settings.theme === option.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>
        <Switch
          label="Reduce motion"
          description="Minimise transitions and auto-advancing carousels."
          checked={settings.reduceMotion}
          onChange={(value) => update({ reduceMotion: value })}
        />
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-white/[0.02] p-4">
        <h2 className="mb-1 text-sm font-semibold">Playback</h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Quality</span>
            <Select
              aria-label="Preferred quality"
              value={settings.quality}
              onChange={(event) => update({ quality: event.target.value as QualityPreference })}
            >
              <option value="auto">Auto (match screen)</option>
              <option value="highest">Highest available</option>
              <option value="lowest">Lowest (save data)</option>
            </Select>
            <p className="mt-1 text-[10px] text-muted-foreground">Only renditions returned by the API are used.</p>
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Aspect ratio</span>
            <Select
              aria-label="Aspect ratio"
              value={settings.aspectRatio}
              onChange={(event) => update({ aspectRatio: event.target.value as AspectRatio })}
            >
              {ASPECTS.map((aspect) => (
                <option key={aspect.value} value={aspect.value}>
                  {aspect.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Preferred subtitles</span>
            <Select
              aria-label="Preferred subtitle language"
              value={settings.subtitleLanguage ?? ''}
              onChange={(event) => update({ subtitleLanguage: event.target.value || null })}
            >
              <option value="">Always off</option>
              {SUBTITLE_LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.label}
                  {language.native ? ` · ${language.native}` : ''}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[10px] text-muted-foreground">Applied only when the stream really exposes that track.</p>
          </div>
        </div>
        <Switch
          label="Autoplay next episode"
          description="When an episode ends, try the next one automatically (only if the API has a stream for it)."
          checked={settings.autoplayNext}
          onChange={(value) => update({ autoplayNext: value })}
        />
        <Switch
          label="Muted by default"
          description="Start playback muted (helps with browser autoplay policies)."
          checked={settings.muted}
          onChange={(value) => update({ muted: value })}
        />
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-white/[0.02] p-4">
        <h2 className="mb-1 text-sm font-semibold">Your data</h2>
        <p className="text-xs text-muted-foreground">
          {state.list.length} saved titles · {state.history.length} history entries, stored in localStorage under <code>{APP.storagePrefix}</code>.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (window.confirm('Clear watch history and continue-watching progress?')) {
                clearHistory()
                push('Watch history cleared', 'success')
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear history
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              reset()
              push('Preferences reset', 'success')
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset preferences
          </Button>
          <Link to="/my-list" className="inline-flex h-8 items-center rounded-full border border-border px-3 text-xs font-semibold">
            Manage My List
          </Link>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-white/[0.02] p-4">
        <h2 className="mb-1 text-sm font-semibold">About this build</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          eMovies runs entirely in the browser and talks to the public Filmy Flow API. It hosts no media, keeps no account and stores no
          credentials. Not every streaming feature can exist without the matching API data — see the{' '}
          <Link to="/capabilities" className="text-primary hover:underline">
            capability map
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
