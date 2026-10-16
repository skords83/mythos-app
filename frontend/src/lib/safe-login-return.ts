/**
 * Accept only internal application paths as post-login destinations.
 * Reject external URLs, protocol-relative URLs and control characters.
 */
export function safeLoginReturn(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard'
  }

  if (/[\u0000-\u001f\u007f\\]/.test(value)) {
    return '/dashboard'
  }

  try {
    const url = new URL(value, 'http://mythos.local')

    if (url.origin !== 'http://mythos.local') {
      return '/dashboard'
    }

    // Avoid redirecting back to the login page.
    if (url.pathname === '/login') {
      return '/dashboard'
    }

    return url.pathname + url.search + url.hash
  } catch {
    return '/dashboard'
  }
}
