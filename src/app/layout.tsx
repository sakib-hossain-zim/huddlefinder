import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from '@/components/layout/Providers'
import Navbar from '@/components/layout/Navbar'
import { STRINGS } from '@/utils/strings'
import Footer from '@/components/layout/Footer'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: {
    default: `${STRINGS.appName} — ${STRINGS.descriptor}`,
    template: `%s | ${STRINGS.appName}`,
  },
  description: `${STRINGS.tagline} Discover where to watch live sport across Canada.`,
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://huddlefinder.ca'),
  openGraph: {
    siteName: STRINGS.appName,
    type: 'website',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#C02D28',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navbar />
          {children}
          <Footer />
        </Providers>
        <SpeedInsights/>
      </body>
    </html>
  )
}