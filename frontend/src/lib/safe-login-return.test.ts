import { safeLoginReturn } from './safe-login-return'

describe('safeLoginReturn', () => {
  test('verwendet das Dashboard als Standard', () => {
    expect(safeLoginReturn(null)).toBe('/dashboard')
    expect(safeLoginReturn('')).toBe('/dashboard')
  })

  test('erlaubt interne Pfade mit Parametern', () => {
    expect(
      safeLoginReturn('/oauth/authorize?client_id=chatgpt&state=abc')
    ).toBe('/oauth/authorize?client_id=chatgpt&state=abc')
  })

  test('lehnt externe URLs ab', () => {
    expect(safeLoginReturn('https://example.com')).toBe('/dashboard')
    expect(safeLoginReturn('//example.com')).toBe('/dashboard')
    expect(safeLoginReturn('/\\example.com')).toBe('/dashboard')
  })

  test('lehnt Steuerzeichen ab', () => {
    expect(safeLoginReturn('/dashboard\nhttps://example.com')).toBe('/dashboard')
  })

  test('verhindert eine Rückleitung zur Anmeldung', () => {
    expect(safeLoginReturn('/login')).toBe('/dashboard')
    expect(safeLoginReturn('/login?returnTo=/login')).toBe('/dashboard')
  })
})
