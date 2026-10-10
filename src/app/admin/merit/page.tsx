'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminMeritRankingPage() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/applications?pageSize=100&sortBy=merit')
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then((data) => {
        setApplications(data.applications || []);
        setLoading(false);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  // Filter and rank for selected year
  const yearApps = applications
    .filter((a) => (a.data.year_of_study || 1) === selectedYear && a.status !== 'draft' && a.status !== 'withdrawn')
    .sort((a, b) => {
      if (b.merit_score !== a.merit_score) {
        return (b.merit_score || 0) - (a.merit_score || 0);
      }
      // Means tie-break: lower income gets higher ranking
      return (a.data.family_annual_income || 0) - (b.data.family_annual_income || 0);
    });

  const topTen = yearApps.slice(0, 10);
  const currentAwardee = yearApps.find((a) => a.status === 'accepted');

  const handleSelectAwardee = async (appId: string) => {
    if (!confirm('Award the official scholarship to this candidate for this study year? Other candidates can be marked as not selected.')) {
      return;
    }

    setProcessingId(appId);
    try {
      const res = await fetch(`/api/admin/applications/${appId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          remark: `Selected by the Committee as the official scholarship recipient for Year ${selectedYear} B.E.`,
        }),
      });

      if (res.ok) {
        // Refresh
        const freshRes = await fetch('/api/admin/applications?pageSize=100&sortBy=merit');
        const freshData = await freshRes.json();
        setApplications(freshData.applications || []);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkShortlistTop10 = async () => {
    if (!confirm(`Shortlist top ${topTen.length} candidates in Year ${selectedYear} for Committee award review?`)) {
      return;
    }

    for (const app of topTen) {
      if (app.status === 'submitted') {
        await fetch(`/api/admin/applications/${app.id}/decision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'shortlist',
            remark: `Shortlisted in top merit list for Year ${selectedYear} B.E. award.`,
          }),
        });
      }
    }

    const freshRes = await fetch('/api/admin/applications?pageSize=100&sortBy=merit');
    const freshData = await freshRes.json();
    setApplications(freshData.applications || []);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-xs text-gray-600">
        Loading merit scoring and selection helper...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            MNC Endowment Fund Committee Tool
          </div>
          <h1 className="text-xl font-bold text-[#AC3D47]">
            Merit Ranking & Awardee Selection Helper
          </h1>
          <div className="text-xs text-gray-600">
            Automated ranking: 1st Year = II PUC %; 2nd–4th Year = CGPA (Zero backlogs). One awardee per year.
          </div>
        </div>

        <button
          type="button"
          onClick={handleBulkShortlistTop10}
          className="gov-btn gov-btn-primary text-xs"
        >
          ★ Shortlist Candidates for Award
        </button>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="border-b border-gray-300 mb-6 flex gap-4 text-xs font-bold text-gray-700">
        <Link href="/admin" className="pb-2 hover:text-[#AC3D47]">Overview</Link>
        <Link href="/admin/applications" className="pb-2 hover:text-[#AC3D47]">All Applications</Link>
        <Link href="/admin/merit" className="pb-2 border-b-2 border-[#AC3D47] text-[#AC3D47]">Merit & Awardee Ranking</Link>
        <Link href="/admin/scholarships" className="pb-2 hover:text-[#AC3D47]">Scholarships & Deadlines</Link>
        <Link href="/admin/users" className="pb-2 hover:text-[#AC3D47]">Staff Users</Link>
        <Link href="/admin/audit" className="pb-2 hover:text-[#AC3D47]">Audit Log</Link>
      </div>

      {/* Year Selection Tabs */}
      <div className="flex border border-gray-300 bg-white mb-6">
        {[1, 2, 3, 4].map((yr) => (
          <button
            key={yr}
            type="button"
            onClick={() => setSelectedYear(yr)}
            className={`flex-1 py-3 text-xs font-bold border-r last:border-r-0 ${
              selectedYear === yr
                ? 'bg-[#AC3D47] text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Year {yr} B.E. ({applications.filter((a) => (a.data.year_of_study || 1) === yr).length} Candidates)
          </button>
        ))}
      </div>

      {/* Selection Status Banner */}
      <div className="border border-gray-300 bg-[#EEF1F6] p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <span className="font-bold text-[#AC3D47]">Current Status for Year {selectedYear} B.E.: </span>
          {currentAwardee ? (
            <span className="text-emerald-800 font-bold">
              ✓ Awardee Finalized: {currentAwardee.data.full_name} ({currentAwardee.ref_no})
            </span>
          ) : (
            <span className="text-amber-800 font-bold">
              Awardee Not Yet Decided (Committee Evaluation Pending)
            </span>
          )}
        </div>
        <div className="text-gray-600 text-[11px]">
          Rule 5 & 6: Evaluated by Scrutiny Committee → Exactly 1 student awarded per year
        </div>
      </div>

      {/* Top Candidates Table */}
      <div className="border border-gray-300 bg-white mb-8">
        <div className="gov-header-bar flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide">
            Top Merit Roster (Year {selectedYear} B.E.)
          </span>
          <span className="text-xs font-normal text-gray-600">
            Tie-Break: Merit Descending, then Family Income Ascending (Means)
          </span>
        </div>

        {topTen.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            No submitted applications found for Year {selectedYear} B.E.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-300 text-gray-700">
                  <th className="p-3 font-bold border-r border-gray-200 text-center w-12">Rank</th>
                  <th className="p-3 font-bold border-r border-gray-200">Ref No.</th>
                  <th className="p-3 font-bold border-r border-gray-200">Candidate Name & USN</th>
                  <th className="p-3 font-bold border-r border-gray-200">Branch</th>
                  <th className="p-3 font-bold border-r border-gray-200">Qualifying Score</th>
                  <th className="p-3 font-bold border-r border-gray-200">Family Income</th>
                  <th className="p-3 font-bold border-r border-gray-200">Current Status</th>
                  <th className="p-3 font-bold text-center">Committee Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topTen.map((app, index) => {
                  const isAwarded = app.status === 'accepted';

                  return (
                    <tr key={app.id} className={isAwarded ? 'bg-emerald-50' : 'hover:bg-gray-50'}>
                      <td className="p-3 font-bold text-center border-r border-gray-200 font-mono text-sm text-[#AC3D47]">
                        #{index + 1}
                      </td>
                      <td className="p-3 font-mono font-bold border-r border-gray-200 text-[#AC3D47]">
                        <Link href={`/admin/applications/${app.id}`} className="hover:underline">
                          {app.ref_no}
                        </Link>
                      </td>
                      <td className="p-3 border-r border-gray-200">
                        <div className="font-bold text-gray-900">{app.data.full_name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          USN: {app.data.usn} • Mobile: {app.data.mobile}
                        </div>
                      </td>
                      <td className="p-3 border-r border-gray-200">{app.data.course}</td>
                      <td className="p-3 border-r border-gray-200 font-mono">
                        {selectedYear === 1 ? (
                          <span className="font-bold">{app.computed?.percentage || app.data.percentage}% (PUC)</span>
                        ) : (
                          <span className="font-bold">{app.data.cgpa} CGPA (Score: {app.merit_score})</span>
                        )}
                      </td>
                      <td className="p-3 border-r border-gray-200 font-mono font-bold text-[#AC3D47]">
                        Rs. {(app.data.family_annual_income || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 border-r border-gray-200 uppercase font-bold text-[10px]">
                        {app.status}
                      </td>
                      <td className="p-3 text-center space-x-1 whitespace-nowrap">
                        <Link
                          href={`/admin/applications/${app.id}`}
                          className="gov-btn gov-btn-secondary text-[11px] py-1 px-2.5 min-h-[28px]"
                        >
                          View
                        </Link>
                        {isAwarded ? (
                          <span className="bg-emerald-700 text-white font-bold px-2 py-1 text-[10px]">
                            ✓ AWARDEE
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={processingId === app.id}
                            onClick={() => handleSelectAwardee(app.id)}
                            className="gov-btn bg-emerald-700 text-white hover:bg-emerald-800 text-[11px] py-1 px-2.5 min-h-[28px] font-bold"
                          >
                            Award Scholarship
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
