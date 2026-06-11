import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from '@/components/layout/Providers'
import Navbar from '@/components/layout/Navbar'
import { STRINGS } from '@/utils/strings'
import Footer from '@/components/layout/Footer'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: {
    default:  `${STRINGS.appName} — Find Sports Bars & Watch Parties in Canada`,
    template: `%s | ${STRINGS.appName}`,
  },
  description: 'Find the best sports bars, pubs and watch parties near you in Canada. See live events, buy tickets and RSVP for FIFA World Cup 2026, NHL, NBA, NFL and more.',
  keywords: [
    'sports bar Canada',
    'watch party Canada',
    'watch party Vancouver',
    'watch party Toronto',
    'watch party Calgary',
    'watch party Montreal',
    'FIFA World Cup 2026 Canada',
    'FIFA World Cup 2026 Vancouver',
    'FIFA World Cup 2026 Toronto',
    'FIFA World Cup 2026 Calgary',
    'FIFA World Cup 2026 Montreal',
    'sports bar near me',
    'where to watch football Canada',
    'where to watch soccer Canada',
    'where to watch world cup live Canada',
    'live sports bar Canada',
    'live sports bar Vancouver',
    'live sports bar Toronto',
    'live sports bar Calgary',
    'live sports bar Montreal',
    'NHL watch party',
    'World Cup bar Vancouver',
    'sports bar Toronto',
    'where to watch World Cup Canada',
    'where to watch World Cup Vancouver',
    'where to watch World Cup Toronto',
    'where to watch World Cup Calgary',
    'where to watch World Cup Montreal',
    'live sports screening Canada',
    'live sports screening Vancouver',
    'live sports screening Calgary',
    'live sports screening Toronto',
    'live sports screening Montreal',
    
  ],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.huddlefinder.ca'),
  openGraph: {
    siteName:    STRINGS.appName,
    type:        'website',
    title:       `${STRINGS.appName} — Find Sports Bars & Watch Parties in Canada`,
    description: 'Find the best sports bars and watch parties near you. FIFA World Cup 2026, NHL, NBA, NFL and more.',
    url:         'https://www.huddlefinder.ca',
    images: [
      {
        url:    '/icons/icon-512x512.png',
        width:  512,
        height: 512,
        alt:    STRINGS.appName,
      },
    ],
  },
  twitter: {
    card:        'summary_large_image',
    title:       `${STRINGS.appName} — Find Sports Bars in Canada`,
    description: 'Find the best sports bars and watch parties near you across Canada.',
  },
  manifest: '/manifest.json',

  // ── PWA icons ──────────────────────────────────────
  icons: {
    icon: [
      { url: '/icons/favicon.ico' },
      { url: '/icons/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/favicon.svg',       type: 'image/svg+xml' },
    ],
    apple:    '/icons/apple-touch-icon.png',
    shortcut: '/icons/favicon.ico',
  },
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
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}