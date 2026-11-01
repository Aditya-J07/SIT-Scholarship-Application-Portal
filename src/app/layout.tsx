import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LanguageProvider } from '@/components/LanguageToggle';

import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'optional',
  variable: '--font-inter',
  fallback: ['system-ui', 'arial'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://scholarships.sit.ac.in'),
  title: 'SIT Scholarship Portal | Siddaganga Institute of Technology, Tumakuru',
  description:
    'Official Scholarship Application Portal for Siddaganga Institute of Technology (SIT), Tumakuru – 572103. Apply online for Dr. M.N. Channabasappa Endowment Fund, Sri Sripathi K A Memorial Scholarship, and college financial assistance.',
  keywords: [
    'SIT Tumkur',
    'Siddaganga Institute of Technology',
    'Scholarships',
    'MNC Endowment Fund',
    'SSKA Scholarship',
    'Engineering Scholarships Karnataka',
  ],
  icons: {
    icon: [
      { url: '/sit-logo.png', type: 'image/png' },
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/sit-logo.png',
    apple: '/sit-logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col bg-white text-gray-900 antialiased selection:bg-[#AC3D47] selection:text-white`}>
        <noscript>
          <div className="bg-amber-100 border-b border-amber-300 p-3 text-center text-amber-950 font-bold text-xs" role="alert">
            JavaScript is required to use the SIT Scholarship Application Portal. Please enable JavaScript in your browser settings to proceed.
          </div>
        </noscript>
        <LanguageProvider>
          <Header />
          <main id="main-content" className="flex-1 w-full">
            {children}
          </main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
