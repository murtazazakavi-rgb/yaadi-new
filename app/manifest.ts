import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Yaadi',
    short_name: 'Yaadi',
    description: 'Track birthdays, waras, anniversaries, wafaat, and family connections.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#FAF8F4',
    theme_color: '#6B8E6E',
    icons: [
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
