import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://scholarships.sit.ac.in';

  const publicRoutes = [
    '',
    '/scholarships/MNC',
    '/scholarships/SSKA',
    '/privacy',
    '/terms',
    '/faq',
    '/accessibility',
    '/login',
    '/register',
  ];

  return publicRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '' ? 1.0 : route.startsWith('/scholarships') ? 0.9 : 0.7,
  }));
}
