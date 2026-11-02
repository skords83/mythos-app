// Browser regression using isolated API fixtures; never reads or writes user data.
const { chromium } = require(process.env.MYTHOS_PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const origin = process.env.MYTHOS_UI_TEST_ORIGIN || 'http://127.0.0.1:4000'
const output = process.env.MYTHOS_SCREENSHOT_DIR || '/tmp/mythos-universe-design'
;(async () => {
  fs.mkdirSync(output, { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.MYTHOS_CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
    const errors = []; page.on('pageerror', e => errors.push(e.message))
    const book = { id: 'book-fixture', title: 'Die Küste', description: '', wordGoal: 500, dailyWordCount: 0, lastWriteDate: '2026-11-02', createdAt: '2026-11-02', updatedAt: '2026-11-02' }
    const worlds = [{ id: 'world-fixture', title: 'Die Nordlande', description: 'Eine gemeinsame Welt für die Geschichten zwischen Küste und Gebirge.', visibility: 'PRIVATE', updatedAt: 'version-1' }]
    let failSave = false
    await page.route('**/api/**', async route => {
      const request = route.request(); const path = new URL(request.url()).pathname
      let data = []
      if (path === '/api/auth') data = { user: { id: 'user-fixture', name: 'Testautorin' } }
      if (path === '/api/projects') data = { projects: [book], pagination: { page: 1, totalPages: 1, hasMore: false } }
      if (path === '/api/chapters') data = { chapters: [], pagination: { page: 1, totalPages: 1, hasMore: false } }
      if (path === '/api/projects/book-fixture') data = book
      if (path === '/api/settings') data = { settings: {} }
      if (path === '/api/story') {
        const { action, args } = request.postDataJSON()
        data = { entries: [], hasMore: false }
        if (action === 'universes') data = { entries: worlds, hasMore: false }
        if (action === 'universe') data = worlds.find(w => w.id === args.universeId)
        if (action === 'create_universe' || action === 'update_universe') {
          if (failSave) return route.fulfill({ status: 409, json: { error: 'Testkonflikt: Bitte erneut speichern.' } })
          data = { ...args, id: args.universeId || 'created-fixture', updatedAt: 'version-2' }
          if (action === 'create_universe') worlds.push(data)
          else Object.assign(worlds.find(w => w.id === args.universeId), data)
        }
        return route.fulfill({ json: { data } })
      }
      await route.fulfill({ json: data })
    })
    await page.goto(origin + '/universes')
    await page.evaluate(() => localStorage.setItem('selectedProjectId', 'book-fixture'))
    await page.goto(origin + '/')
    await page.getByRole('link', { name: 'Universen', exact: true }).waitFor()
    await page.screenshot({ animations: 'disabled', path: `${output}/book-navigation.png` })
    await page.getByRole('link', { name: 'Universen', exact: true }).click()
    await page.waitForURL('**/universes?projectId=book-fixture')
    await page.getByRole('button', { name: 'Zum geöffneten Buch' }).click()
    await page.waitForURL(origin + '/')
    await page.getByRole('link', { name: 'Universen', exact: true }).click()
    await page.getByRole('button', { name: /Die Nordlande/ }).click()
    await page.getByRole('heading', { name: 'Zugehörige Bücher' }).waitFor()
    assert.equal(await page.getByRole('button', { name: /Die Nordlande/ }).getAttribute('aria-pressed'), 'true')
    for (const theme of ['light', 'dark']) for (const mobile of [false, true]) {
      await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 })
      await page.evaluate(t => document.documentElement.classList.toggle('dark', t === 'dark'), theme)
      await page.locator('main').evaluate(el => { el.scrollTop = 0 })
      await page.screenshot({ animations: 'disabled', path: `${output}/detail-${theme}-${mobile ? 'mobile' : 'desktop'}.png` })
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      assert.equal(await page.locator('main').evaluate(el => el.scrollWidth > el.clientWidth), false)
      await page.getByRole('heading', { name: 'Gemeinsames Wissen' }).scrollIntoViewIfNeeded()
      await page.screenshot({ animations: 'disabled', path: `${output}/knowledge-${theme}-${mobile ? 'mobile' : 'desktop'}.png` })
    }
    await page.getByRole('button', { name: 'Neues Universum', exact: true }).click()
    const title = page.getByLabel('Titel', { exact: true })
    assert.equal(await title.evaluate(el => el === document.activeElement), true)
    assert.equal(await page.getByRole('button', { name: 'Universum speichern', exact: true }).isDisabled(), true)
    await title.fill('Die Südlande')
    await page.keyboard.press('Tab')
    assert.equal(await page.getByLabel('Beschreibung', { exact: true }).evaluate(el => el === document.activeElement), true)
    await page.keyboard.press('Tab')
    assert.equal(await page.getByRole('combobox', { name: /^Sichtbarkeit/ }).evaluate(el => el === document.activeElement), true)
    await page.keyboard.press('Tab')
    assert.equal(await page.getByRole('button', { name: 'Universum speichern', exact: true }).evaluate(el => getComputedStyle(el).outlineStyle), 'solid')
    failSave = true
    await page.keyboard.press('Enter')
    await page.getByRole('alert').filter({ hasText: 'Testkonflikt' }).waitFor()
    assert.equal(await title.inputValue(), 'Die Südlande')
    failSave = false
    await title.press('Enter')
    await page.getByText('Universum gespeichert.', { exact: true }).waitFor()
    assert.equal(worlds.at(-1).title, 'Die Südlande')
    await page.getByRole('button', { name: 'Zur Buchübersicht' }).click()
    await page.waitForURL('**/dashboard')
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.getByRole('link', { name: 'Universen', exact: true }).click()
    await page.waitForURL('**/universes')
    assert.equal(await page.getByRole('button', { name: 'Zum geöffneten Buch' }).count(), 0)
    assert.deepEqual(errors, [])
    console.log('PASS: book → universes → book/dashboard; selection/create/error/retry; keyboard/focus; details desktop/mobile/light/dark, no overflow or JS errors. API fixtures only.')
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exitCode = 1 })
