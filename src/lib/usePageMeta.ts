import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const ORIGIN = 'https://thecursedapple.app'

/**
 * Per-route SEO: document title, meta description, and canonical URL.
 * The canonical always points at the custom domain, so the pages.dev alias
 * never competes in search results.
 */
export function usePageMeta(title: string, description?: string) {
  const location = useLocation()

  useEffect(() => {
    document.title = title

    if (description) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.name = 'description'
        document.head.appendChild(meta)
      }
      meta.content = description
    }

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = `${ORIGIN}${location.pathname}`
  }, [title, description, location.pathname])
}
