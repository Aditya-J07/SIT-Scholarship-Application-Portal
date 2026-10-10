import { db } from '@/lib/db';
import HomePageContent from '@/components/HomePageContent';

export default function HomePage() {
  const scholarships = db.listScholarships();
  const cycles = db.listCycles();

  return <HomePageContent scholarships={scholarships} cycles={cycles} />;
}
