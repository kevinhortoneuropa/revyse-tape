import { expect, test } from '@playwright/test'

import {
  card,
  cardOrder,
  dragCard,
  clearFilter,
  dragCardWithKeyboard,
  expectCardCount,
  expectCardCountNot,
  nextCardKey,
  setFilter,
  themeClass,
  waitForHydration,
} from './helpers'

test.describe('the dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows at least ten cryptocurrencies', async ({ page }) => {
    const symbols = await cardOrder(page)
    expect(symbols.length).toBeGreaterThanOrEqual(10)
  })

  test('each card shows a name, a symbol, a USD price and a BTC price', async ({ page }) => {
    const bitcoin = card(page, 'BTC')

    await expect(bitcoin).toContainText('Bitcoin')
    await expect(bitcoin).toContainText('BTC')
    await expect(bitcoin.locator('dd').first()).toContainText('$')
    // BTC priced against itself is exactly one.
    await expect(bitcoin.locator('dd').nth(1)).toHaveText('1.00000000')
  })

  // The rates map mixes 635 fiat and crypto keys.
  test('never shows a fiat currency', async ({ page }) => {
    const symbols = await cardOrder(page)
    expect(symbols).not.toContain('AED')
    expect(symbols).not.toContain('ALL')
  })

  test('renders before JavaScript runs', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/')

    expect((await cardOrder(page)).length).toBeGreaterThanOrEqual(10)
    await context.close()
  })

  // Without a file in public/, /favicon.ico falls past the static layer into the
  // Remix router, which throws "No route matches URL" and answers 404 with a
  // rendered error document. Crawlers, unfurlers and Safari request this path
  // regardless of any <link> tag, so the file has to exist.
  const ICONS = [
    ['/favicon.ico', /image\/(x-icon|vnd\.microsoft\.icon)/],
    ['/favicon.svg', /image\/svg\+xml/],
    ['/apple-touch-icon.png', /image\/png/],
  ] as const

  for (const [path, contentType] of ICONS) {
    test(`serves ${path} as a static file, not through the router`, async ({ page }) => {
      const response = await page.request.get(path)

      expect(response.status()).toBe(200)
      expect(response.headers()['content-type']).toMatch(contentType)
      // A rendered error document would be HTML, and far larger than an icon.
      expect((await response.body()).length).toBeGreaterThan(100)
    })
  }

  test('declares the icon set in the document head', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('link[rel="icon"][href="/favicon.svg"]')).toHaveCount(1)
    await expect(page.locator('link[rel="icon"][href="/favicon.ico"]')).toHaveCount(1)
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1)
  })
})

test.describe('drag and drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('reorders cards by dragging', async ({ page }) => {
    const before = await cardOrder(page)
    expect(before[0]).toBe('BTC')

    await dragCard(page, 'ETH', 'BTC')

    const after = await cardOrder(page)
    expect(after[0]).toBe('ETH')
    expect(after[1]).toBe('BTC')
    // Nothing else moved.
    expect(after.slice(2)).toEqual(before.slice(2))
  })

  test('the order survives a reload', async ({ page }) => {
    await dragCard(page, 'SOL', 'BTC')
    const afterDrag = await cardOrder(page)
    expect(afterDrag[0]).toBe('SOL')

    await page.reload()
    await expect(page.locator('[data-symbol]').first()).toHaveAttribute('data-symbol', 'SOL')
    expect(await cardOrder(page)).toEqual(afterDrag)
  })

  test('the order survives an auto-refresh of the prices', async ({ page }) => {
    await dragCard(page, 'ETH', 'BTC')

    // Force a revalidation the way the timer does, then confirm nothing moved.
    await page.getByRole('button', { name: /refresh exchange rates now/i }).click()
    await expect(page.getByText('Updating…')).toBeHidden()

    expect((await cardOrder(page))[0]).toBe('ETH')
  })

  test('is operable with the keyboard alone', async ({ page }) => {
    await waitForHydration(page)
    const before = await cardOrder(page)

    // One column on a phone, four on a desktop: "the next card" is a different
    // arrow key depending on the viewport.
    const key = await nextCardKey(page, before[0]!, before[1]!)
    await dragCardWithKeyboard(page, before[0]!, key)

    const after = await cardOrder(page)
    expect(after[0]).toBe(before[1])
    expect(after[1]).toBe(before[0])
  })

  // The reason a filtered drag must reorder by symbol and never by index.
  test('dragging within a filter does not disturb the hidden cards', async ({ page }) => {
    await waitForHydration(page)
    const unfiltered = await cardOrder(page)

    await setFilter(page, 'coin')
    // Wait for the grid, not the URL: setSearchParams changes the address bar
    // before React commits the re-render.
    await expectCardCountNot(page, unfiltered.length)

    const visible = await cardOrder(page)
    expect(visible.length).toBeGreaterThan(1)
    expect(visible.length).toBeLessThan(unfiltered.length)

    await dragCard(page, visible[1]!, visible[0]!)

    await clearFilter(page)
    await expectCardCount(page, unfiltered.length)
    const restored = await cardOrder(page)

    // Every hidden card kept its relative position.
    const hiddenBefore = unfiltered.filter((s) => !visible.includes(s))
    const hiddenAfter = restored.filter((s) => !visible.includes(s))
    expect(hiddenAfter).toEqual(hiddenBefore)
  })
})

test.describe('filtering', () => {
  test('narrows the list and puts the query in the URL', async ({ page }) => {
    await page.goto('/')
    await setFilter(page, 'eth')

    await expect(page).toHaveURL(/\?q=eth/)
    await expectCardCount(page, 1)
    expect(await cardOrder(page)).toEqual(['ETH'])
  })

  test('a shared link reproduces the filtered view on first paint', async ({ page }) => {
    await page.goto('/?q=bitcoin')
    expect(await cardOrder(page)).toEqual(['BTC', 'BCH'])
  })

  test('matches on name as well as symbol', async ({ page }) => {
    await page.goto('/?q=solana')
    expect(await cardOrder(page)).toEqual(['SOL'])
  })

  test('shows an empty state when nothing matches', async ({ page }) => {
    await page.goto('/?q=zzzz')
    await expect(page.getByText(/No assets match/)).toBeVisible()
    expect(await cardOrder(page)).toEqual([])
  })

  test('clearing the filter removes it from the URL', async ({ page }) => {
    await page.goto('/?q=eth')
    await clearFilter(page)

    await expect(page).not.toHaveURL(/q=/)
  })
})

test.describe('refresh', () => {
  test('the manual refresh fetches new prices', async ({ page }) => {
    await page.goto('/')
    const before = await card(page, 'BTC').locator('dd').first().textContent()

    await page.getByRole('button', { name: /refresh exchange rates now/i }).click()

    // The mock upstream moves BTC on every request.
    await expect(card(page, 'BTC').locator('dd').first()).not.toHaveText(before ?? '')
  })

  test('shows when the prices were last updated', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('time')).toBeVisible()
  })
})

test.describe('theme', () => {
  test('toggles and persists across a reload, with no flash', async ({ page }) => {
    await page.goto('/')
    expect(await themeClass(page)).toBe('')

    await page.getByRole('button', { name: /switch to light theme/i }).click()
    await expect(page.locator('html')).toHaveClass('light')

    await page.getByRole('button', { name: /switch to dark theme/i }).click()
    await expect(page.locator('html')).toHaveClass('dark')

    await page.reload()

    // The class is present in the very first painted frame, from the cookie —
    // not applied by a script after hydration.
    expect(await themeClass(page)).toBe('dark')
  })

  test('the server sends the theme in the HTML, before any script runs', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /switch to light theme/i }).click()
    await page.getByRole('button', { name: /switch to dark theme/i }).click()
    await expect(page.locator('html')).toHaveClass('dark')

    const response = await page.request.get('/')
    expect(await response.text()).toContain('<html lang="en" class="dark"')
  })

  // Remix's thesis: the same component works without JavaScript.
  test('works with JavaScript disabled', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()

    await page.goto('/')
    expect(await themeClass(page)).toBe('')

    await page.getByRole('button', { name: /switch to light theme/i }).click()
    await page.waitForURL('/')

    expect(await themeClass(page)).toBe('light')
    await context.close()
  })
})
