import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow:     '/',
      disallow:  [
        '/venue-dashboard/',
        '/dashboard/',
        '/onboarding/',
        '/api/',
      ],
    },
    sitemap: 'https://www.huddlefinder.ca/sitemap.xml',
  }
}