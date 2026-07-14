// frontend/src/lib/__tests__/theme.test.ts
import * as theme from '../theme'

describe('theme', () => {
  it('exports non-empty string constants for every design token', () => {
    const values = Object.values(theme)
    expect(values.length).toBeGreaterThan(0)
    values.forEach((value) => {
      expect(typeof value).toBe('string')
      expect((value as string).length).toBeGreaterThan(0)
    })
  })

  it('uses rounded-none as the default radius, not soft rounding', () => {
    expect(theme.RADIUS).toBe('rounded-none')
  })

  it('accent uses the locked indigo palette, not the old green', () => {
    expect(theme.ACCENT).toContain('indigo-600')
    expect(theme.ACCENT).not.toContain('4A7C59')
  })

  it('card shadow is a hard offset shadow, not a soft blur', () => {
    expect(theme.CARD_SHADOW).toBe('shadow-[4px_4px_0_0_#18181b]')
  })

  it('modal tokens use flat-design palette with no rounding', () => {
    expect(theme.OVERLAY).toBe('bg-zinc-950/60 shadow-[4px_4px_0_0_#18181b]')
    expect(theme.MODAL_PANEL).toBe('bg-stone-50 dark:bg-zinc-950')
    expect(theme.INPUT).toBe('bg-stone-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700')
    expect(theme.BUTTON_SECONDARY).toBe('bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700')
  })
})
