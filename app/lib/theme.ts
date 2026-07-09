import { z } from 'zod'

/**
 * `system` is a real, stored preference — not the absence of one. It means
 * "follow the OS", which CSS resolves via `prefers-color-scheme` without any
 * JavaScript. `light` and `dark` are explicit overrides.
 */
export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const

export type ThemePreference = (typeof THEME_PREFERENCES)[number]

/** The URL and the cookie are both user-writable, so both are parsed. */
export const themePreferenceSchema = z.enum(THEME_PREFERENCES)

export const DEFAULT_THEME: ThemePreference = 'system'

/**
 * Parse an untrusted value, falling back to the default.
 *
 * A hand-edited cookie must never throw — the dashboard renders regardless of
 * what the user put in it.
 */
export function parseThemePreference(value: unknown): ThemePreference {
  const result = themePreferenceSchema.safeParse(value)
  return result.success ? result.data : DEFAULT_THEME
}

/**
 * The class the server writes onto `<html>`.
 *
 * `system` deliberately emits nothing: the stylesheet's `prefers-color-scheme`
 * query then decides, so an OS-dark user gets dark on the first byte with no
 * cookie, no script, and no flash.
 */
export function themeClass(preference: ThemePreference): string {
  return preference === 'system' ? '' : preference
}

/**
 * Cycles system -> light -> dark -> system, so every state is reachable from a
 * single button. A total map rather than modular arithmetic on an index: there
 * is no bounds check to get wrong, and no unreachable fallback to pretend to test.
 */
const NEXT_PREFERENCE: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
}

export function nextThemePreference(current: ThemePreference): ThemePreference {
  return NEXT_PREFERENCE[current]
}
