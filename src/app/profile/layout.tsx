import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Profile | SIT Scholarship Portal',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
