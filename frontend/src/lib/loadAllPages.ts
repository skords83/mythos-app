export class ListLoadError extends Error {
  constructor(public status: number) {
    super('Die Liste konnte nicht vollständig geladen werden.')
  }
}

// Never return a partial list as a successful result. Consumers can invalidate
// requests on navigation so old pages neither replace current data nor keep loading.
export async function loadAllPages<T>(
  url: string,
  key: string,
  isCurrent: () => boolean = () => true,
): Promise<T[]> {
  const items: T[] = []
  let page = 1
  let totalPages = 1
  do {
    if (!isCurrent()) return []
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}page=${page}`, { cache: 'no-store' })
    if (!isCurrent()) return []
    if (!response.ok) throw new ListLoadError(response.status)
    const data = await response.json()
    if (!isCurrent()) return []
    const count = data.pagination?.totalPages
    if (!Array.isArray(data[key]) || !Number.isInteger(count) || count < 0 ||
        (count > 0 && page > count) || (page < count && data[key].length === 0)) {
      throw new ListLoadError(502)
    }
    items.push(...data[key])
    totalPages = count
    page++
  } while (page <= totalPages)
  return items
}
