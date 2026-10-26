import { useEffect } from 'react'
import { APP } from '@/config/app'

export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP.name}` : `${APP.name} — Stream movies, series & anime`
  }, [title])
}
