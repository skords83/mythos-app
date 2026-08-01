// frontend/src/lib/__tests__/theme.test.ts
import * as theme from '../theme'

describe('theme', () => {
  it('exports non-empty string constants for every string-valued design token', () => {
    const values = Object.values(theme).filter((value) => typeof value === 'string')
    expect(values.length).toBeGreaterThan(0)
    values.forEach((value) => {
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

  it('has no shadow tokens — structure comes from hairlines only, never elevation', () => {
    Object.values(theme).forEach((value) => {
      if (typeof value === 'string') {
        expect(value).not.toMatch(/\bshadow-/)
      }
    })
  })

  it('modal/overlay tokens are flat — no blur, no gradient, no old green', () => {
    expect(theme.OVERLAY).not.toContain('blur')
    expect(theme.MODAL_PANEL).not.toContain('4A7C59')
    expect(theme.INPUT).not.toContain('4A7C59')
    expect(theme.BUTTON_SECONDARY).not.toContain('4A7C59')
  })

  it('icon preset is a single consistent size/stroke-width, not a class string', () => {
    expect(theme.ICON_PROPS).toEqual({ size: 18, strokeWidth: 1.75 })
  })
})
