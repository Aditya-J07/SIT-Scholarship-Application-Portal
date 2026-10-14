import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Dashboard | SIT Scholarship Portal',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
