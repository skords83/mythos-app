import type { Metadata } from 'next'
import { headers } from 'next/headers'
import localFont from 'next/font/local'
import './globals.css'
import 'tippy.js/dist/tippy.css'

// middleware adds a per-request CSP nonce; static HTML cannot carry that nonce.
export const dynamic = 'force-dynamic'

const robotoFlex = localFont({
  src: './fonts/RobotoFlex.woff2',
  weight: '100 1000',
  display: 'swap',
  variable: '--font-display',
})

const roboto = localFont({
  src: './fonts/Roboto.woff2',
  weight: '400 700',
  display: 'swap',
  variable: '--font-body',
})

const ibmPlexMono = localFont({
  src: [
    { path: './fonts/IBMPlexMono-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/IBMPlexMono-Medium.woff2', weight: '500', style: 'normal' },
  ],
  display: 'swap',
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
