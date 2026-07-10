import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

const ORDERING_KEY = 'revyse:ordering:v1'

export const card = (page: Page, symbol: string) => page.locator(`[data-symbol="${symbol}"]`)

const readStoredOrdering = (page: Page) =>
  page.evaluate((key) => window.localStorage.getItem(key), ORDERING_KEY)

/**
 * Wait until a reorder has actually been committed.
 *
 * dnd-kit releasing the card and React re-rendering the grid are two different
 * moments. Reading the DOM between them sees the *old* order and the test fails
 * claiming nothing moved. Every successful reorder persists, so waiting for the
 * stored value to change is an exact signal — no sleep, no guesswork.
 */
async function waitForReorderCommitted(page: Page, previous: string | null): Promise<void> {
  await page.waitForFunction(({ key, before }) => window.localStorage.getItem(key) !== before, {
    key: ORDERING_KEY,
    before: previous,
  })
}

/**
 * Wait until React has taken over from the server-rendered HTML.
 *
 * Every card is in the DOM before any script runs, so `toBeVisible()` proves
 * nothing about interactivity — a drag or a keystroke fired now is simply lost.
 * dnd-kit mounts its screen-reader instructions element only on the client, and
 * gives it the `id` we hand to DndContext, so its presence is an unambiguous
 * and version-stable signal that hydration has finished.
 */
export async function waitForHydration(page: Page): Promise<void> {
  await page.locator('div#asset-grid').waitFor({ state: 'attached' })
}

/** The symbols currently rendered, top-left to bottom-right. */
export async function cardOrder(page: Page): Promise<string[]> {
  return page
    .locator('[data-symbol]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-symbol') ?? ''))
}

/**
 * Wait until the grid has actually re-rendered to `count` cards.
 *
 * `setSearchParams` updates the URL *before* React commits the new grid, so
 * asserting on the URL and then reading the DOM is a race. Chromium usually
 * wins it; WebKit does not. Wait on the thing under test, never on a proxy for it.
 */
export async function expectCardCount(page: Page, count: number): Promise<void> {
  await expect(page.locator('[data-symbol]')).toHaveCount(count)
}

/** Wait until the grid has re-rendered to anything other than `count` cards. */
export async function expectCardCountNot(page: Page, count: number): Promise<void> {
  await expect(page.locator('[data-symbol]')).not.toHaveCount(count)
}

/**
 * Type into the filter box, retrying until the value sticks.
 *
 * For a few hundred milliseconds after a dnd-kit drop, WebKit silently swallows
 * a single-shot `fill()`: the drop settles, React re-renders, and the controlled
 * input's value is restored from the URL — which has not changed yet, because
 * the change event never landed. Chromium wins this race; WebKit does not.
 *
 * `toPass()` retries the fill until the DOM agrees, which converges immediately
 * in Chromium and after the drop settles in WebKit. A `waitForTimeout(300)`
 * would also "work", and would be a magic number hiding a race.
 */
export async function setFilter(page: Page, value: string): Promise<void> {
  const input = page.getByRole('searchbox')

  await expect(async () => {
    await input.fill(value)
    expect(await input.inputValue()).toBe(value)
  }).toPass({ timeout: 5_000 })
}

export const clearFilter = (page: Page) => setFilter(page, '')

/**
 * Drag one card onto another.
 *
 * `page.dragAndDrop()` does not work with dnd-kit, and this is the single most
 * common reason people give up on testing it. Playwright's helper fires
 * mousedown, one mousemove, then mouseup. dnd-kit's PointerSensor has an
 * activation constraint — it ignores a press until the pointer has travelled a
 * few pixels — and its collision detection only updates on pointer *movement*.
 * One jump straight to the target therefore activates nothing and drops on
 * nobody, so the test passes while asserting that nothing happened.
 *
 * The fix is to move like a hand does: cross the activation threshold first,
 * then travel in steps so collision detection sees intermediate positions, then
 * settle before releasing.
 */
export async function dragCard(page: Page, from: string, to: string): Promise<void> {
  await waitForHydration(page)
  const storedBefore = await readStoredOrdering(page)

  const source = card(page, from)
  const target = card(page, to)

  await source.scrollIntoViewIfNeeded()
  const start = await source.boundingBox()
  const end = await target.boundingBox()

  if (!start || !end) throw new Error(`Cannot drag ${from} onto ${to}: a card is not visible`)

  const startX = start.x + start.width / 2
  const startY = start.y + start.height / 2
  const endX = end.x + end.width / 2
  const endY = end.y + end.height / 2

  await page.mouse.move(startX, startY)
  await page.mouse.down()

  // 1. Cross the 6px activation constraint. Without this the drag never starts.
  await page.mouse.move(startX + 12, startY, { steps: 6 })

  // 2. Travel in steps so collision detection observes the path, not a teleport.
  await page.mouse.move(endX, endY, { steps: 24 })

  // 3. Settle, so the final `over` target is committed before release.
  await page.mouse.move(endX, endY + 1, { steps: 4 })

  await page.mouse.up()

  // dnd-kit animates the drop, so the DOM lags the mouseup. It sets
  // aria-pressed="true" on the card being held — a real state signal, unlike
  // the `active:cursor-grabbing` utility class, which sits in className always.
  await expect(page.locator('[aria-pressed="true"]')).toHaveCount(0)
  await waitForReorderCommitted(page, storedBefore)
}

export type ArrowKey = 'ArrowRight' | 'ArrowLeft' | 'ArrowDown' | 'ArrowUp'

/**
 * Which arrow key moves a card to the *next* one in reading order.
 *
 * The grid is one column on a phone and four on a desktop, so "the card after
 * this one" is ArrowDown on the former and ArrowRight on the latter. A test
 * hard-coding either direction passes on one viewport and silently asserts
 * nothing on the other.
 */
export async function nextCardKey(page: Page, first: string, second: string): Promise<ArrowKey> {
  const a = await card(page, first).boundingBox()
  const b = await card(page, second).boundingBox()
  if (!a || !b) throw new Error('Cannot measure the grid: a card is not visible')

  return Math.abs(a.y - b.y) < 4 ? 'ArrowRight' : 'ArrowDown'
}

/**
 * Pick up a card with the keyboard, move it `steps` places, and drop it.
 *
 * Each press must be acknowledged before the next is sent. Firing
 * Space -> ArrowRight -> Space back to back drops the card before dnd-kit has
 * registered the pick-up, and the board never moves.
 *
 * The acknowledgements are the accessibility features themselves: `aria-pressed`
 * marks the card as held, and the live region narrates every move. Waiting on
 * those rather than on a sleep is what makes this deterministic — and it means
 * the test would fail if we ever broke the announcements.
 */
export async function dragCardWithKeyboard(
  page: Page,
  symbol: string,
  direction: ArrowKey,
  steps = 1,
): Promise<void> {
  await waitForHydration(page)
  const storedBefore = await readStoredOrdering(page)

  const held = page.locator('[aria-pressed="true"]')
  const liveRegion = page.locator('[id^="DndLiveRegion"]')

  // dnd-kit puts its listeners on the wrapper, not on the card itself.
  await card(page, symbol).locator('..').focus()

  await page.keyboard.press('Space')
  await expect(held).toHaveCount(1)

  // The pick-up announcement arrives asynchronously. Sending an arrow before it
  // lands means the live region is still empty, so any "the text changed" check
  // is satisfied by the pick-up itself — and the card is then dropped on top of
  // where it started, moving nothing.
  await expect(liveRegion).toContainText(`${symbol} is over ${symbol}.`)

  for (let i = 0; i < steps; i += 1) {
    await page.keyboard.press(direction)
  }

  // Only drop once the card is genuinely over a *different* card. dnd-kit
  // announces `X is over Y`, so this is the sensor telling us it found a
  // neighbour rather than us hoping it did.
  await expect(liveRegion).not.toContainText(`is over ${symbol}.`)

  await page.keyboard.press('Space')
  await expect(held).toHaveCount(0)
  await waitForReorderCommitted(page, storedBefore)
}

export const themeClass = (page: Page) => page.evaluate(() => document.documentElement.className)
