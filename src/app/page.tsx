import { db } from '@/lib/db';
import HomePageContent from '@/components/HomePageContent';

export default async function HomePage() {
  const scholarships = await db.listScholarships();
  const cycles = await db.listCycles();

  return <HomePageContent scholarships={scholarships} cycles={cycles} />;
}
