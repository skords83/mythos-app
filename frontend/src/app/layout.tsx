import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Roboto_Flex, Roboto, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import 'tippy.js/dist/tippy.css'

// middleware adds a per-request CSP nonce; static HTML cannot carry that nonce.
export const dynamic = 'force-dynamic'

const robotoFlex = Roboto_Flex({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-display',
})

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-body',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Mythos - Schreib-App',
  description: 'Eine minimalistische Schreib-App für Autoren',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <html lang="de" suppressHydrationWarning className={`${robotoFlex.variable} ${roboto.variable} ${ibmPlexMono.variable}`}>
      <body className="min-h-screen text-zinc-900 dark:text-zinc-200">
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()`,
          }}
        />
        {children}
      </body>
    </html>
  )
}
