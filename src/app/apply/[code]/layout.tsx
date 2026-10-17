import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Apply for Scholarship | SIT Scholarship Portal',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ApplyCodeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
