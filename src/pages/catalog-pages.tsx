import { CatalogView } from '@/components/content/catalog-view'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function MoviesPage() {
  useDocumentTitle('Movies')
  return (
    <CatalogView
      eyebrow="Catalogue"
      heading="Movies"
      description="Feature films from every corner of the catalogue. Combine genre, year, country, subtitle language and rating filters."
      source="movie"
      showTypeNav
      activeType="movies"
      defaultSort="recommended"
    />
  )
}

export function SeriesPage() {
  useDocumentTitle('TV Series')
  return (
    <CatalogView
      eyebrow="Catalogue"
      heading="TV Series"
      description="Long-form drama, comedy and everything between. Seasons are discovered from the catalogue; episodes are resolved on demand."
      source="series"
      showTypeNav
      activeType="series"
    />
  )
}

export function AnimePage() {
  useDocumentTitle('Anime')
  return (
    <CatalogView
      eyebrow="Catalogue"
      heading="Anime"
      description="Titles tagged with the “Anime” genre by the upstream catalogue."
      source="anime"
      showTypeNav
      activeType="anime"
      emptyMessage="No anime titles were returned in the pages loaded so far. Load more of the catalogue and try again."
    />
  )
}

export function TrendingPage() {
  useDocumentTitle('Trending')
  return (
    <CatalogView
      eyebrow="Discovery"
      heading="Trending now"
      description="The catalogue's own trending ranking (/trending), page by page."
      source="trending"
      defaultSort="recommended"
    />
  )
}

export function RecentPage() {
  useDocumentTitle('Recently added')
  return (
    <CatalogView
      eyebrow="Discovery"
      heading="Recently added"
      description="Newest releases first, sorted from the loaded catalogue pages by release date."
      source="all"
      defaultSort="recent"
    />
  )
}

export function TopRatedPage() {
  useDocumentTitle('Top rated')
  return (
    <CatalogView
      eyebrow="Discovery"
      heading="Top rated"
      description="Highest rated titles from the loaded catalogue, using the IMDb rating published by the API."
      source="all"
      defaultSort="rating"
    />
  )
}
