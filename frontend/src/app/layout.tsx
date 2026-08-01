import type { Metadata } from 'next'
import { Roboto_Flex, Roboto, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import 'tippy.js/dist/tippy.css'

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" suppressHydrationWarning className={`${robotoFlex.variable} ${roboto.variable} ${ibmPlexMono.variable}`}>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  )
}
