import { db } from '@/lib/db';
import HomePageContent from '@/components/HomePageContent';
import { getTranslation } from '@/lib/i18n';

export const revalidate = 60;

export default async function HomePage() {
  const scholarships = await db.listScholarships();
  const cycles = await db.listCycles();
  const t = getTranslation('en');

  return <HomePageContent scholarships={scholarships} cycles={cycles} t={t} lang="en" />;
}
