'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminOverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/applications?pageSize=5')
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-xs text-gray-600">
        Loading administration portal...
      </div>
    );
  }

  const summary = data?.summary || {};
  const recent = data?.applications || [];

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
            Current Cycle: 2026–2027 | Automated Merit Calculation & Eligibility Engine
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/admin/applications" className="gov-btn gov-btn-primary text-xs">
            Review Applications
          </Link>
          <Link href="/admin/merit" className="gov-btn gov-btn-secondary text-xs">
            Merit & Selection Helper
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
      <div className="border-b border-gray-300 mb-6 flex gap-4 text-xs font-bold text-gray-700">
        <Link href="/admin" className="pb-2 border-b-2 border-[#AC3D47] text-[#AC3D47]">
          Overview
        </Link>
        <Link href="/admin/applications" className="pb-2 hover:text-[#AC3D47]">
          All Applications ({summary.totalApplications || 0})
        </Link>
        <Link href="/admin/merit" className="pb-2 hover:text-[#AC3D47]">
          Merit Evaluation Roster
        </Link>
        <Link href="/admin/scholarships" className="pb-2 hover:text-[#AC3D47]">
          Scholarships & Deadlines
        </Link>
        <Link href="/admin/users" className="pb-2 hover:text-[#AC3D47]">
          Staff Users
        </Link>
        <Link href="/admin/audit" className="pb-2 hover:text-[#AC3D47]">
          Audit Log
        </Link>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <div className="gov-card p-4 border-l-4 border-l-[#AC3D47]">
          <div className="text-[11px] font-bold text-gray-500 uppercase">Total Files</div>
          <div className="text-2xl font-bold text-[#AC3D47] mt-1">{summary.totalApplications || 0}</div>
          <div className="text-[10px] text-gray-500 mt-1">All cycles & drafts</div>
        </div>

        <div className="gov-card p-4 border-l-4 border-l-purple-600">
          <div className="text-[11px] font-bold text-gray-500 uppercase">Submitted</div>
          <div className="text-2xl font-bold text-purple-700 mt-1">{summary.submittedCount || 0}</div>
          <div className="text-[10px] text-gray-500 mt-1">Awaiting scrutiny</div>
        </div>

        <div className="gov-card p-4 border-l-4 border-l-blue-600">
          <div className="text-[11px] font-bold text-gray-500 uppercase">Shortlisted</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{summary.shortlistedCount || 0}</div>
          <div className="text-[10px] text-gray-500 mt-1">Committee review</div>
        </div>

        <div className="gov-card p-4 border-l-4 border-l-amber-600">
          <div className="text-[11px] font-bold text-gray-500 uppercase">Corrections</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{summary.needsCorrectionCount || 0}</div>
          <div className="text-[10px] text-gray-500 mt-1">Returned to student</div>
        </div>

        <div className="gov-card p-4 border-l-4 border-l-emerald-600">
          <div className="text-[11px] font-bold text-gray-500 uppercase">Sanctioned</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{summary.acceptedCount || 0}</div>
          <div className="text-[10px] text-gray-500 mt-1">Approved awardees</div>
        </div>

        <div className="gov-card p-4 border-l-4 border-l-red-600">
          <div className="text-[11px] font-bold text-gray-500 uppercase">Rejected</div>
          <div className="text-2xl font-bold text-red-700 mt-1">{summary.rejectedCount || 0}</div>
          <div className="text-[10px] text-gray-500 mt-1">Ineligible or quota</div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="gov-card p-5">
          <h2 className="font-bold text-[#AC3D47] text-sm uppercase tracking-wider mb-3 border-b border-gray-200 pb-2">
            Recent Candidate Submissions
          </h2>

          <div className="divide-y divide-gray-200 text-xs">
            {recent.map((app: any) => (
              <div key={app.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-gray-800">{app.data.full_name}</div>
                  <div className="text-[11px] text-gray-500 font-mono">
                    {app.ref_no} • {app.data.scholarship_code} • Year {app.data.year_of_study || 1}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#AC3D47]">
                    {app.merit_score ? `${app.merit_score.toFixed(2)} pts` : ''}
                  </span>
                  <Link
                    href={`/admin/applications/${app.id}`}
                    className="gov-btn gov-btn-secondary text-[11px] py-1 px-2.5 min-h-[28px]"
                  >
                    Scrutinize →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-gray-200 text-center">
            <Link href="/admin/applications" className="text-xs font-bold text-[#AC3D47] hover:underline">
              View All Applications & Filter Table →
            </Link>
          </div>
        </div>

        <div className="gov-card p-5">
          <h2 className="font-bold text-[#AC3D47] text-sm uppercase tracking-wider mb-3 border-b border-gray-200 pb-2">
            Endowment Fund Selection Tools (MNC Rules)
          </h2>
          <div className="space-y-3 text-xs text-gray-700">
            <p className="leading-relaxed">
              Under Dr. M.N. Channabasappa Endowment guidelines, each academic year selects four total students (one each for 1st, 2nd, 3rd, and 4th year B.E.).
            </p>
            <div className="border border-[#AC3D47]/30 bg-[#FDF5F6] p-3 text-gray-900 space-y-1">
              <div>• <strong>1st Year B.E. Merit:</strong> Ranked by II PUC % marks.</div>
              <div>• <strong>2nd to 4th Year B.E. Merit:</strong> Ranked by previous year CGPA with strictly zero backlogs.</div>
              <div>• <strong>Committee Selection:</strong> Top applicants per year evaluated on academic performance and family income means.</div>
            </div>
            <div className="pt-2">
              <Link href="/admin/merit" className="gov-btn gov-btn-primary text-xs w-full">
                Launch Merit Ranking & Selection Helper →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
