import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Staff & Administrative Console | SIT Scholarship Portal',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session) {
    redirect('/admin-login');
  }

  if (session.role !== 'admin' && session.role !== 'reviewer') {
    redirect('/login');
  }

  if (session.mustChangePassword) {
    redirect('/change-password');
  }

  // Enforce AAL2 MFA for all administrative pages
  if (session.aal !== 'aal2') {
    redirect('/admin-login/mfa');
  }

  return <>{children}</>;
}
