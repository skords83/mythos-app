import { useEffect, useState } from 'react'

export interface SearchResultItem {
  id: string
  title: string
  snippet: string
  chapterId?: string
}

export interface SearchResults {
  chapters: SearchResultItem[]
  characters: SearchResultItem[]
  places: SearchResultItem[]
  notes: SearchResultItem[]
  items: SearchResultItem[]
  factions: SearchResultItem[]
  scenes: SearchResultItem[]
  timelineEvents: SearchResultItem[]
  loreEntries: SearchResultItem[]
}

const EMPTY_RESULTS: SearchResults = {
  chapters: [], characters: [], places: [], notes: [],
  items: [], factions: [], scenes: [], timelineEvents: [], loreEntries: [],
}

export function useSearch(projectId: string | undefined) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (!projectId || query.trim().length < 2) {
      setResults(EMPTY_RESULTS)
      setIsSearching(false)
      return
    }

    const controller = new AbortController()
    setIsSearching(true)

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?projectId=${encodeURIComponent(projectId)}&q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal }
        )
        if (res.ok) {
          const data = await res.json()
          setResults(data)
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Search error:', error)
        }
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [projectId, query])

  return { query, setQuery, results, isSearching }
}
