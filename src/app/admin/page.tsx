'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface OverviewData {
  totalApplications: number;
  countsByStatus: Record<string, number>;
  countsByScholarship: Record<string, number>;
  applicationsPerDay: { date: string; count: number }[];
  missingDocumentsCount: number;
  missingDocumentsApps: { id: string; ref_no: string; missingCount: number }[];
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/overview')
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then((resData: OverviewData) => {
        setData(resData);
        setLoading(false);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-xs text-gray-600">
        Loading administration portal analytics...
      </div>
    );
  }

  const countsByStatus = data?.countsByStatus || {};
  const countsByScholarship = data?.countsByScholarship || {};
  const perDay = data?.applicationsPerDay || [];
  const missingDocsCount = data?.missingDocumentsCount || 0;
  const missingApps = data?.missingDocumentsApps || [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Title & Nav Bar */}
      <div className="border border-gray-300 bg-white p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            SIT Scholarship Administration & Committee Portal
          </div>
          <h1 className="text-xl font-bold text-[#AC3D47] mt-0.5">
            Institutional Scrutiny Dashboard
          </h1>
          <div className="text-xs text-gray-600">
            Current Academic Cycle | Automated Server-Side Metrics & Overview
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/admin/applications" className="gov-btn gov-btn-primary text-xs">
            Review Applications
          </Link>
          <Link href="/admin/merit" className="gov-btn gov-btn-secondary text-xs">
            Merit & Selection Helper
          </Link>
          <Link href="/admin/data-requests" className="gov-btn gov-btn-secondary text-xs">
            Student Data Requests
          </Link>
          <a
            href="/api/admin/export?format=csv"
            className="gov-btn gov-btn-outline text-xs"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="border-b border-gray-300 mb-6 flex flex-wrap gap-4 text-xs font-bold text-gray-700">
        <Link href="/admin" className="pb-2 border-b-2 border-[#AC3D47] text-[#AC3D47]">
          Overview
        </Link>
        <Link href="/admin/applications" className="pb-2 hover:text-[#AC3D47]">
          All Applications ({data?.totalApplications || 0})
        </Link>
        <Link href="/admin/merit" className="pb-2 hover:text-[#AC3D47]">
          Merit Evaluation Roster
        </Link>
        <Link href="/admin/scholarships" className="pb-2 hover:text-[#AC3D47]">
          Scholarships & Deadlines
        </Link>
        <Link href="/admin/data-requests" className="pb-2 hover:text-[#AC3D47]">
          Data Requests
        </Link>
        <Link href="/admin/users" className="pb-2 hover:text-[#AC3D47]">
          Staff Users
        </Link>
        <Link href="/admin/audit" className="pb-2 hover:text-[#AC3D47]">
          Audit Log
        </Link>
      </div>

      {/* Status Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
        <div className="gov-card p-3 border-l-4 border-l-[#AC3D47]">
          <div className="text-[10px] font-bold text-gray-500 uppercase">Total Files</div>
          <div className="text-xl font-bold text-[#AC3D47] mt-1">{data?.totalApplications || 0}</div>
        </div>
        <div className="gov-card p-3 border-l-4 border-l-gray-400">
          <div className="text-[10px] font-bold text-gray-500 uppercase">Drafts</div>
          <div className="text-xl font-bold text-gray-700 mt-1">{countsByStatus.draft || 0}</div>
        </div>
        <div className="gov-card p-3 border-l-4 border-l-blue-600">
          <div className="text-[10px] font-bold text-gray-500 uppercase">Submitted</div>
          <div className="text-xl font-bold text-blue-700 mt-1">{countsByStatus.submitted || 0}</div>
        </div>
        <div className="gov-card p-3 border-l-4 border-l-yellow-600">
          <div className="text-[10px] font-bold text-gray-500 uppercase">Under Review</div>
          <div className="text-xl font-bold text-yellow-700 mt-1">{countsByStatus.under_review || 0}</div>
        </div>
        <div className="gov-card p-3 border-l-4 border-l-orange-600">
          <div className="text-[10px] font-bold text-gray-500 uppercase">Corrections</div>
          <div className="text-xl font-bold text-orange-700 mt-1">{countsByStatus.needs_correction || 0}</div>
        </div>
        <div className="gov-card p-3 border-l-4 border-l-purple-600">
          <div className="text-[10px] font-bold text-gray-500 uppercase">Shortlisted</div>
          <div className="text-xl font-bold text-purple-700 mt-1">{countsByStatus.shortlisted || 0}</div>
        </div>
        <div className="gov-card p-3 border-l-4 border-l-emerald-600">
          <div className="text-[10px] font-bold text-gray-500 uppercase">Accepted</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{countsByStatus.accepted || 0}</div>
        </div>
        <div className="gov-card p-3 border-l-4 border-l-red-600">
          <div className="text-[10px] font-bold text-gray-500 uppercase">Rejected</div>
          <div className="text-xl font-bold text-red-700 mt-1">{countsByStatus.rejected || 0}</div>
        </div>
      </div>

      {/* Two Column Layout: Counts by Scholarship & Applications Missing Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Counts by Scholarship */}
        <div className="border border-gray-300 bg-white">
          <div className="gov-header-bar flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide">Applications by Scholarship</span>
            <span className="text-[10px] text-gray-500">Live Breakdown</span>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {Object.entries(countsByScholarship).map(([code, count]) => (
                <div key={code} className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <div>
                    <span className="font-bold text-xs text-[#AC3D47] font-mono">{code}</span>
                    <span className="text-[11px] text-gray-600 ml-2">
                      {code === 'MNC' ? 'M.N. Channabasappa Endowment' : code === 'SSKA' ? 'Sri Sripathi K A Memorial' : 'Institutional Aid'}
                    </span>
                  </div>
                  <span className="font-bold font-mono text-sm bg-gray-100 px-2 py-0.5 border border-gray-300">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Applications Missing Documents */}
        <div className="border border-gray-300 bg-white">
          <div className="gov-header-bar flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide">Missing Documents Alert</span>
            <span className="text-[10px] font-bold text-amber-700">
              {missingDocsCount} Incomplete
            </span>
          </div>
          <div className="p-4">
            {missingApps.length === 0 ? (
              <div className="text-center text-xs text-emerald-700 py-6 font-bold">
                ✓ All submitted applications have all 9 required documents uploaded.
              </div>
            ) : (
              <div>
                <p className="text-[11px] text-gray-600 mb-3">
                  The following active applications are missing required enclosures:
                </p>
                <div className="space-y-2">
                  {missingApps.map((item) => (
                    <div key={item.id} className="flex items-center justify-between border border-amber-200 bg-amber-50 p-2 text-xs">
                      <Link href={`/admin/applications/${item.id}`} className="font-mono font-bold text-[#AC3D47] hover:underline">
                        {item.ref_no}
                      </Link>
                      <span className="text-amber-800 font-bold">
                        Missing {item.missingCount} document(s)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Applications Per Day Table */}
      <div className="border border-gray-300 bg-white mb-8">
        <div className="gov-header-bar flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide">Daily Submission Volume (Last 14 Days)</span>
          <span className="text-[10px] text-gray-500">Server Aggregation</span>
        </div>
        {perDay.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500">
            No submissions recorded in the last 14 days.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-300 text-gray-700">
                  <th className="p-3 font-bold border-r border-gray-200">Date</th>
                  <th className="p-3 font-bold border-r border-gray-200">New Applications / Submissions</th>
                  <th className="p-3 font-bold text-right">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {perDay.map(({ date, count }) => (
                  <tr key={date} className="hover:bg-gray-50">
                    <td className="p-3 font-mono font-bold text-gray-800 border-r border-gray-200">
                      {date}
                    </td>
                    <td className="p-3 font-mono font-bold text-[#AC3D47] border-r border-gray-200">
                      {count}
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-block bg-[#AC3D47] h-3" style={{ width: `${Math.min(count * 20, 200)}px` }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
