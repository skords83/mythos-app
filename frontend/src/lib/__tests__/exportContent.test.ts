import { loadProjectExportContent } from '../exportContent'

const originalFetch = global.fetch
const response = (data: unknown) => ({ ok: true, json: async () => data })
afterEach(() => { global.fetch = originalFetch })

test('loads all pages and unopened chapter contents in manuscript order', async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce(response({ chapters: [{ id: 'a', title: 'Zweites', order: 2 }], pagination: { totalPages: 2 } }))
    .mockResolvedValueOnce(response({ chapters: [{ id: 'z', title: 'Erstes', order: 1 }], pagination: { totalPages: 2 } }))
    .mockResolvedValueOnce(response({ title: 'Erstes', content: '<p>Erster Text</p>' }))
    .mockResolvedValueOnce(response({ title: 'Zweites', content: { content: '<p>Zweiter Text<img src="/api/upload/a.png"></p>' } }))
  const html = await loadProjectExportContent('project')
  expect(html).toContain('Erster Text')
  expect(html).toContain('Zweiter Text')
  expect(html).toContain('/api/upload/a.png')
  expect(html.indexOf('Erster Text')).toBeLessThan(html.indexOf('Zweiter Text'))
  expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/chapters?projectId=project&limit=200&page=2', { cache: 'no-store' })
})

test('includes current editor content before autosave finishes', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce(response({ chapters: [{ id: 'a', title: 'Alt', order: 1 }], pagination: { totalPages: 1 } }))
  const html = await loadProjectExportContent('project', { id: 'a', title: 'Neu & aktuell', content: '<p>Noch nicht gespeichert</p>' })
  expect(html).toContain('Neu &amp; aktuell')
  expect(html).toContain('Noch nicht gespeichert')
  expect(global.fetch).toHaveBeenCalledTimes(1)
})

test('aborts instead of exporting a partial manuscript on a failed chapter request', async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce(response({ chapters: [{ id: 'a', title: 'Fehlt', order: 1 }], pagination: { totalPages: 1 } }))
    .mockResolvedValueOnce({ ok: false })
  await expect(loadProjectExportContent('project')).rejects.toThrow('Fehlt')
})
