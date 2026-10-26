import { useMemo, useState } from 'react'
import { Globe, Languages as LanguagesIcon, Subtitles } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { getMovies, getSeries, aggregateFacets } from '@/services/api'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageHeader } from '@/components/layout/page-header'
import { Link } from '@/router/Link'
import { ErrorState } from '@/components/ui/states'
import { Skeleton } from '@/components/ui/skeleton'
import { Segmented } from '@/components/ui/segmented'
import { codeForLabel, languageLabel } from '@/services/languages'

type Mode = 'subtitles' | 'audio'

export function LanguagesPage() {
  useDocumentTitle('Languages')
  const [mode, setMode] = useState<Mode>('subtitles')

  const { data, loading, error, reload } = useAsync(async (signal) => {
    const [movies, series] = await Promise.all([getMovies(1, 24, { signal }), getSeries(1, 24, { signal })])
    return [...movies.items, ...series.items]
  }, [])

  const facets = useMemo(() => aggregateFacets(data ?? []), [data])
  const list = mode === 'subtitles' ? facets.subtitleLanguages : facets.audioLanguages

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-20 lg:px-8 lg:pt-24">
      <PageHeader
        eyebrow="Browse"
        title="Languages"
        description="Two different things live here, and eMovies keeps them apart: subtitle languages are published per title by the API, while audio languages exist only as separate dub entries. Neither is invented."
      >
        <div className="pt-1">
          <Segmented
            label="Language type"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'subtitles', label: 'Subtitle languages' },
              { value: 'audio', label: 'Audio variants' },
            ]}
          />
        </div>
      </PageHeader>

      <div className="mb-5 rounded-xl border border-border bg-white/[0.03] p-3 text-xs text-muted-foreground">
        {mode === 'subtitles' ? (
          <p className="flex gap-2">
            <Subtitles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            Sourced from the <code className="mx-1 rounded bg-muted px-1">subtitles</code> field of each title. Selecting a language filters
            the catalogue to titles that advertise a subtitle track in it — availability in the player is confirmed from the caption endpoint.
          </p>
        ) : (
          <p className="flex gap-2">
            <LanguagesIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            These are titles whose name/metadata marks a language variant (for example “Colony [Hindi]”). Dubs are published as separate
            catalogue entries, so switching audio means switching to that entry — not a fake in-player track.
          </p>
        )}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 15 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No {mode === 'subtitles' ? 'subtitle' : 'audio'} languages were advertised in the pages loaded so far.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {list.map((language) => {
            const code = codeForLabel(language.value)
            const label = languageLabel(code) !== 'Unknown' ? languageLabel(code) : language.value
            return (
              <Link
                key={language.value}
                to={`/languages/${encodeURIComponent(language.value)}?mode=${mode}`}
                className="group flex items-center justify-between gap-2 rounded-xl border border-border bg-white/[0.03] px-3.5 py-3 transition hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Globe className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{label}</span>
                    {language.value !== label ? <span className="block truncate text-[10px] text-muted-foreground">{language.value}</span> : null}
                  </span>
                </span>
                <span className="text-[11px] tabular-nums text-muted-foreground">{language.count}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
