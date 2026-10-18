import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Student Profile | SIT Scholarship Portal',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (session?.mustChangePassword) {
    redirect('/change-password');
  }

  return <>{children}</>;
}
