import { Suspense } from 'react'
import { OAuthAuthorizeContent } from './OAuthAuthorizeContent'

export default function OAuthAuthorizePage() {
  return (
    <Suspense fallback={<p>OAuth-Anfrage wird geladen …</p>}>
      <OAuthAuthorizeContent />
    </Suspense>
  )
}
