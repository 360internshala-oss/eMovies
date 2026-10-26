import { SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Sheet } from '@/components/ui/sheet'
import { cn } from '@/utils/cn'
import type { CatalogFilters, SortKey } from '@/services/types'

export interface Facets {
  genres: { value: string; count: number }[]
  countries: { value: string; count: number }[]
  years: { value: number; count: number }[]
  subtitleLanguages: { value: string; count: number }[]
  audioLanguages: { value: string; count: number }[]
}

interface FilterBarProps {
  filters: CatalogFilters
  facets: Facets
  onChange: (patch: Partial<CatalogFilters>) => void
  onClear: () => void
  activeCount: number
  /** Optional content-type selector (rendered in the same row) */
  leading?: React.ReactNode
  /** Hide sort when the surface has a fixed ordering */
  showSort?: boolean
}

const SORT_LABELS: Record<SortKey, string> = {
  recommended: 'Recommended',
  recent: 'Newest first',
  rating: 'Top rated',
  title: 'Title A–Z',
}

export function FilterBar({ filters, facets, onChange, onClear, activeCount, leading, showSort = true }: FilterBarProps) {
  const [open, setOpen] = useState(false)

  const chips = useMemo(() => {
    const list: { key: string; label: string; clear: () => void }[] = []
    for (const genre of filters.genres) {
      list.push({ key: `genre-${genre}`, label: genre, clear: () => onChange({ genres: filters.genres.filter((g) => g !== genre) }) })
    }
    if (filters.year) list.push({ key: 'year', label: String(filters.year), clear: () => onChange({ year: null }) })
    if (filters.country) list.push({ key: 'country', label: filters.country, clear: () => onChange({ country: null }) })
    if (filters.subtitleLanguage) list.push({ key: 'subs', label: `Subs: ${filters.subtitleLanguage}`, clear: () => onChange({ subtitleLanguage: null }) })
    if (filters.audioLanguage) list.push({ key: 'audio', label: `Audio: ${filters.audioLanguage}`, clear: () => onChange({ audioLanguage: null }) })
    if (filters.minRating !== null) list.push({ key: 'rating', label: `★ ${filters.minRating}+`, clear: () => onChange({ minRating: null }) })
    return list
  }, [filters, onChange])

  const controls = (
    <>
      <div className="space-y-3">
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Genre</span>
          <Select
            aria-label="Filter by genre"
            value=""
            onChange={(event) => {
              const genre = event.target.value
              if (!genre) return
              if (!filters.genres.some((g) => g.toLowerCase() === genre.toLowerCase())) {
                onChange({ genres: [...filters.genres, genre] })
              }
              event.target.value = ''
            }}
          >
            <option value="">All genres</option>
            {facets.genres.map((genre) => (
              <option key={genre.value} value={genre.value}>
                {genre.value} ({genre.count})
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Year</span>
            <Select
              aria-label="Filter by year"
              value={filters.year ?? ''}
              onChange={(event) => onChange({ year: event.target.value ? Number.parseInt(event.target.value, 10) : null })}
            >
              <option value="">Any year</option>
              {facets.years.map((year) => (
                <option key={year.value} value={year.value}>
                  {year.value}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Country</span>
            <Select
              aria-label="Filter by country"
              value={filters.country ?? ''}
              onChange={(event) => onChange({ country: event.target.value || null })}
            >
              <option value="">Any country</option>
              {facets.countries.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.value}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Subtitle language
            </span>
            <Select
              aria-label="Filter by subtitle language"
              value={filters.subtitleLanguage ?? ''}
              onChange={(event) => onChange({ subtitleLanguage: event.target.value || null })}
            >
              <option value="">Any subtitles</option>
              {facets.subtitleLanguages.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.value} ({language.count})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Audio variant
            </span>
            <Select
              aria-label="Filter by audio language variant"
              value={filters.audioLanguage ?? ''}
              onChange={(event) => onChange({ audioLanguage: event.target.value || null })}
            >
              <option value="">Any audio</option>
              {facets.audioLanguages.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.value} ({language.count})
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Min rating</span>
            <Select
              aria-label="Filter by minimum rating"
              value={filters.minRating ?? ''}
              onChange={(event) => onChange({ minRating: event.target.value ? Number.parseFloat(event.target.value) : null })}
            >
              <option value="">Any rating</option>
              {[9, 8, 7, 6, 5].map((rating) => (
                <option key={rating} value={rating}>
                  ★ {rating}+
                </option>
              ))}
            </Select>
          </div>
          {showSort ? (
            <div>
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Sort by</span>
              <Select
                aria-label="Sort results"
                value={filters.sort}
                onChange={(event) => onChange({ sort: event.target.value as SortKey })}
              >
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <option key={key} value={key}>
                    {SORT_LABELS[key]}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onClear} disabled={activeCount === 0}>
          Clear all
        </Button>
        <Button size="sm" onClick={() => setOpen(false)}>
          Done
        </Button>
      </div>
    </>
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {leading}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition focus-ring sm:h-10',
            activeCount > 0 ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border bg-white/5 text-foreground hover:bg-white/10',
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 ? <span className="rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">{activeCount}</span> : null}
        </button>

        {/* Desktop: inline selects */}
        <div className="hidden items-center gap-2 md:flex">
          <div className="w-44">
            <Select
              aria-label="Filter by genre"
              value=""
              onChange={(event) => {
                const genre = event.target.value
                if (genre && !filters.genres.some((g) => g.toLowerCase() === genre.toLowerCase())) {
                  onChange({ genres: [...filters.genres, genre] })
                }
                event.target.value = ''
              }}
            >
              <option value="">+ Genre</option>
              {facets.genres.slice(0, 30).map((genre) => (
                <option key={genre.value} value={genre.value}>
                  {genre.value}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-32">
            <Select aria-label="Filter by year" value={filters.year ?? ''} onChange={(event) => onChange({ year: event.target.value ? Number(event.target.value) : null })}>
              <option value="">Year</option>
              {facets.years.map((year) => (
                <option key={year.value} value={year.value}>
                  {year.value}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-40">
            <Select aria-label="Filter by country" value={filters.country ?? ''} onChange={(event) => onChange({ country: event.target.value || null })}>
              <option value="">Country</option>
              {facets.countries.slice(0, 40).map((country) => (
                <option key={country.value} value={country.value}>
                  {country.value}
                </option>
              ))}
            </Select>
          </div>
          {showSort ? (
            <div className="w-40">
              <Select aria-label="Sort results" value={filters.sort} onChange={(event) => onChange({ sort: event.target.value as SortKey })}>
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <option key={key} value={key}>
                    {SORT_LABELS[key]}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>

        {activeCount > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-9 items-center px-1 text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Clear all
          </button>
        ) : null}
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-primary/50 bg-primary/15 pl-3 pr-1 text-xs font-semibold text-primary"
            >
              {chip.label}
              <button
                type="button"
                aria-label={`Remove ${chip.label} filter`}
                onClick={chip.clear}
                className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-primary/25"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <Sheet open={open} onClose={() => setOpen(false)} title="Filters" side="bottom" description="Filters apply to the loaded catalogue pages.">
        {controls}
      </Sheet>
    </div>
  )
}
