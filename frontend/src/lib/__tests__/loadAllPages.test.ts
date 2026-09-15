import { loadAllPages, ListLoadError } from '../loadAllPages'
const originalFetch = global.fetch
afterEach(() => { global.fetch = originalFetch })
const response = (items: number[], totalPages: number) => ({ ok: true, json: async () => ({ items, pagination: { totalPages } }) })
it('collects every page in server order', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce(response([1, 2], 3)).mockResolvedValueOnce(response([3, 4], 3)).mockResolvedValueOnce(response([5], 3))
  expect(await loadAllPages('/api/list?limit=2', 'items')).toEqual([1, 2, 3, 4, 5])
  expect(global.fetch).toHaveBeenNthCalledWith(3, '/api/list?limit=2&page=3', { cache: 'no-store' })
})
it('rejects a failed later page instead of returning incomplete data', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce(response([1], 2)).mockResolvedValueOnce({ ok: false, status: 401 })
  await expect(loadAllPages('/api/list', 'items')).rejects.toMatchObject({ status: 401 })
})
it('rejects missing pagination metadata', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [1] }) })
  await expect(loadAllPages('/api/list', 'items')).rejects.toBeInstanceOf(ListLoadError)
})
it('supports an empty list', async () => {
  global.fetch = jest.fn().mockResolvedValue(response([], 0))
  expect(await loadAllPages('/api/list', 'items')).toEqual([])
  expect(global.fetch).toHaveBeenCalledTimes(1)
})
it('stops requesting pages when the caller has navigated away', async () => {
  let current = true
  global.fetch = jest.fn().mockImplementation(async () => { current = false; return response([1], 5) })
  expect(await loadAllPages('/api/list', 'items', () => current)).toEqual([])
  expect(global.fetch).toHaveBeenCalledTimes(1)
})
