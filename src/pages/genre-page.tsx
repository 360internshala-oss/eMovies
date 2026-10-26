import { CatalogView } from '@/components/content/catalog-view'
import { useRoute } from '@/router/RouterProvider'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

function titleCase(value: string): string {
  return value
    .split(/[\s-]+/)
    .map((word) => (word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1) : word.toUpperCase()))
    .join(' ')
}

export function GenrePage() {
  const route = useRoute()
  const rawGenre = route.params.genre ?? ''
  const genre = titleCase(decodeURIComponent(rawGenre).replace(/-/g, ' '))
  useDocumentTitle(`${genre} titles`)

  return (
    <CatalogView
      eyebrow="Genre"
      heading={genre}
      description={`Every title tagged “${genre}” in the pages loaded from the catalogue. Genres come straight from the upstream metadata.`}
      source="all"
      lockedFilters={{ genres: [genre] }}
      defaultSort="rating"
      emptyMessage={`No titles tagged “${genre}” were found in the loaded catalogue pages yet — scroll to load more, or browse the genre index.`}
    />
  )
}
