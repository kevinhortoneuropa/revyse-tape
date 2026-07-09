import { describe, expect, it } from 'vitest'

import {
  DEFAULT_THEME,
  nextThemePreference,
  parseThemePreference,
  themeClass,
  THEME_PREFERENCES,
} from './theme'

describe('parseThemePreference', () => {
  it.each(THEME_PREFERENCES)('accepts %s', (preference) => {
    expect(parseThemePreference(preference)).toBe(preference)
  })

  // The cookie is user-writable. A hand-edited value must never throw: the
  // dashboard renders regardless of what someone typed into devtools.
  it.each([undefined, null, '', 'DARK', 'purple', 42, {}, ['dark']])(
    'falls back to the default for %p',
    (value) => {
      expect(parseThemePreference(value)).toBe(DEFAULT_THEME)
    },
  )
})

describe('themeClass', () => {
  it('emits nothing for system, so prefers-color-scheme decides', () => {
    expect(themeClass('system')).toBe('')
  })

  it('emits an explicit class that overrides the OS preference', () => {
    expect(themeClass('light')).toBe('light')
    expect(themeClass('dark')).toBe('dark')
  })
})

describe('nextThemePreference', () => {
  it('cycles through every preference and returns to the start', () => {
    expect(nextThemePreference('system')).toBe('light')
    expect(nextThemePreference('light')).toBe('dark')
    expect(nextThemePreference('dark')).toBe('system')
  })

  it('reaches every state and returns to where it started', () => {
    const seen = new Set<string>()
    let current = DEFAULT_THEME

    for (const _ of THEME_PREFERENCES) {
      seen.add(current)
      current = nextThemePreference(current)
    }

    expect(seen.size).toBe(THEME_PREFERENCES.length)
    expect(current).toBe(DEFAULT_THEME)
  })
})
