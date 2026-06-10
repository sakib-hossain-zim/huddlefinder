
import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.huddlefinder.ca'

  return [
    {
      url:             `${baseUrl}`,
      lastModified:    new Date(),
      changeFrequency: 'daily',
      priority:        1.0,
    },
    {
      url:             `${baseUrl}/search`,
      lastModified:    new Date(),
      changeFrequency: 'daily',
      priority:        0.9,
    },
    {
      url:             `${baseUrl}/auth/login`,
      lastModified:    new Date(),
      changeFrequency: 'monthly',
      priority:        0.5,
    },
    {
      url:             `${baseUrl}/auth/signup`,
      lastModified:    new Date(),
      changeFrequency: 'monthly',
      priority:        0.6,
    },
    {
      url:             `${baseUrl}/faq`,
      lastModified:    new Date(),
      changeFrequency: 'monthly',
      priority:        0.4,
    },
    {
      url:             `${baseUrl}/privacy`,
      lastModified:    new Date(),
      changeFrequency: 'monthly',
      priority:        0.3,
    },
    {
      url:             `${baseUrl}/terms`,
      lastModified:    new Date(),
      changeFrequency: 'monthly',
      priority:        0.3,
    },
  ]
}