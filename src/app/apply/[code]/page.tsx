import { getCurrentSession } from '@/lib/auth/session';
import ApplyOverview from '@/components/ApplyOverview';

export const revalidate = 60;

export function generateStaticParams() {
  return [
    { code: 'MNC' },
    { code: 'SSKA' },
  ];
}

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await getCurrentSession();

  if (!session) {
    return <ApplyOverview code={code} />;
  }

  const { default: ApplicationWizard } = await import('@/components/ApplicationWizard');
  return <ApplicationWizard code={code} />;
}
