import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const isSSKA = code.toUpperCase() === 'SSKA';
  const title = isSSKA
    ? 'Apply for Sri Sripathi K A Memorial Scholarship | SIT Tumakuru'
    : 'Apply for Meritorious & Needs-Cum Scholarship (MNC) | SIT Tumakuru';
  const description = isSSKA
    ? 'Official application portal for Sri Sripathi K A Memorial Scholarship at Siddaganga Institute of Technology, Tumakuru.'
    : 'Official application portal for Meritorious and Needs-Cum (MNC) Scholarship at Siddaganga Institute of Technology, Tumakuru.';

  return {
    title,
    description,
    alternates: {
      canonical: `https://scholarships.sit.ac.in/apply/${code.toUpperCase()}`,
    },
  };
}

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
