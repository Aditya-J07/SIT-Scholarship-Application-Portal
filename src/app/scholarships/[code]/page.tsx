import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import ScholarshipDetailContent from '@/components/ScholarshipDetailContent';

export default async function ScholarshipDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const scholarship = db.findScholarshipByCode(code);

  if (!scholarship) {
    notFound();
  }

  const cycle = db.findActiveCycleForScholarship(scholarship.id);

  return <ScholarshipDetailContent scholarship={scholarship} cycle={cycle} />;
}
