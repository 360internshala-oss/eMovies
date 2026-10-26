import { Compass } from 'lucide-react'
import { Link } from '@/router/Link'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { EmptyState } from '@/components/ui/states'

export function NotFoundPage() {
  useDocumentTitle('Page not found')
  return (
    <div className="mx-auto flex min-h-[70svh] max-w-2xl items-center px-4 pt-20">
      <div className="w-full">
        <EmptyState
          icon={<Compass className="h-5 w-5" />}
          title="This page doesn't exist"
          message="The link may be old, or the route was never built. Try one of the browse surfaces instead."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
                Home
              </Link>
              <Link to="/movies" className="rounded-full border border-border px-4 py-2 text-sm font-semibold">
                Movies
              </Link>
              <Link to="/series" className="rounded-full border border-border px-4 py-2 text-sm font-semibold">
                Series
              </Link>
              <Link to="/search" className="rounded-full border border-border px-4 py-2 text-sm font-semibold">
                Search
              </Link>
            </div>
          }
        />
      </div>
    </div>
  )
}
