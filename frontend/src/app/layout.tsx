import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="de" suppressHydrationWarning>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  )
}
