import { CatalogView } from '@/components/content/catalog-view'
import { useRoute } from '@/router/RouterProvider'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { languageLabel, codeForLabel } from '@/services/languages'

export function LanguagePage() {
  const route = useRoute()
  const raw = decodeURIComponent(route.params.language ?? '')
  const mode = route.query.get('mode') === 'audio' ? 'audio' : 'subtitles'
  const label = languageLabel(codeForLabel(raw)) !== 'Unknown' ? languageLabel(codeForLabel(raw)) : raw
  useDocumentTitle(`${label} titles`)

  return (
    <CatalogView
      eyebrow={mode === 'subtitles' ? 'Subtitle language' : 'Audio variant'}
      heading={label}
      description={
        mode === 'subtitles'
          ? `Titles that advertise “${raw}” subtitle tracks in the catalogue metadata.`
          : `Titles published as a “${raw}” audio variant. Each variant has its own stream; the player switches by resolving that entry.`
      }
      source="all"
      lockedFilters={mode === 'subtitles' ? { subtitleLanguage: raw } : { audioLanguage: raw }}
      defaultSort="rating"
      emptyMessage="No titles matched this language in the loaded pages. Load more of the catalogue, or check the languages index."
    />
  )
}
