'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApplicationRecord } from '@/lib/types';

export default function AdminMeritRankingPage() {
  const router = useRouter();
  const [selectedScholarship, setSelectedScholarship] = useState<string>('MNC');
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [tieBreakNotes, setTieBreakNotes] = useState<Record<string, string>>({});
  const [awardingAppId, setAwardingAppId] = useState<string | null>(null);
  const [currentTieBreakNote, setCurrentTieBreakNote] = useState<string>('');

  const loadData = () => {
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
  };

  useEffect(() => {
    loadData();
  }, [router]);

  // Filter for selected scholarship and study year
  const filteredApps = applications
    .filter((a) => {
      const matchSch = (a.data.scholarship_code || 'MNC').toUpperCase() === selectedScholarship.toUpperCase();
      const matchYear = (a.data.year_of_study || 1) === selectedYear;
      const notDraft = a.status !== 'draft' && a.status !== 'withdrawn';
      return matchSch && matchYear && notDraft;
    })
    .sort((a, b) => {
      if (b.merit_score !== a.merit_score) {
        return (b.merit_score || 0) - (a.merit_score || 0);
      }
      // Means tie-break: lower income gets higher ranking
      return (a.data.family_annual_income || 0) - (b.data.family_annual_income || 0);
    });

  const topTen = filteredApps.slice(0, 10);
  const currentAwardee = filteredApps.find((a) => a.status === 'accepted');

  const toggleSelectApp = (id: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllEligible = () => {
    const eligibleIds = filteredApps
      .filter((a) => ['submitted', 'under_review'].includes(a.status))
      .map((a) => a.id);
    setSelectedAppIds(eligibleIds);
  };

  const handleBulkShortlist = async () => {
    if (selectedAppIds.length === 0) {
      alert('Please select at least one application to shortlist.');
      return;
    }

    if (!confirm(`Are you sure you want to shortlist ${selectedAppIds.length} candidate(s) for scholarship award review?`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/applications/bulk-shortlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_ids: selectedAppIds,
          remark: `Shortlisted in top merit list for ${selectedScholarship} Year ${selectedYear} B.E. award.`,
        }),
      });

      if (res.ok) {
        alert('Candidates shortlisted successfully.');
        setSelectedAppIds([]);
        loadData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error?.message || 'Failed to shortlist'}`);
      }
    } catch {
      alert('An error occurred during bulk shortlisting.');
    }
  };

  const handleOpenAwardDialog = (app: ApplicationRecord) => {
    setAwardingAppId(app.id);
    setCurrentTieBreakNote(tieBreakNotes[app.id] || '');
  };

  const handleConfirmAward = async (appId: string) => {
    setProcessingId(appId);
    try {
      // 1. Record tie-break remark if entered (kind: tie_break)
      if (currentTieBreakNote.trim()) {
        await fetch(`/api/admin/applications/${appId}/remarks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'tie_break',
            body: `Committee Selection & Tie-Break Note: ${currentTieBreakNote.trim()}`,
            visible_to_student: false,
          }),
        });
      }

      // 2. Accept application
      const res = await fetch(`/api/admin/applications/${appId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          remark: `Selected by the Committee as the official scholarship recipient for Year ${selectedYear} B.E. ${currentTieBreakNote.trim() ? `(Tie-break: ${currentTieBreakNote.trim()})` : ''}`,
        }),
      });

      if (res.ok) {
        setAwardingAppId(null);
        setCurrentTieBreakNote('');
        loadData();
      } else {
        const err = await res.json();
        alert(`Could not award scholarship: ${err.error?.message || 'Failed'}`);
      }
    } finally {
      setProcessingId(null);
    }
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
            Scholarship Committee Evaluation
          </div>
          <h1 className="text-xl font-bold text-[#AC3D47]">
            Merit Ranking & Awardee Selection
          </h1>
          <div className="text-xs text-gray-600">
            Automated ranking per scholarship & year of study. Select Top 10, bulk shortlist, and record tie-break justifications.
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAllEligible}
            className="gov-btn gov-btn-secondary text-xs"
          >
            Select All Eligible
          </button>
          <button
            type="button"
            onClick={handleBulkShortlist}
            disabled={selectedAppIds.length === 0}
            className="gov-btn gov-btn-primary text-xs"
          >
            ★ Shortlist Selected ({selectedAppIds.length})
          </button>
        </div>
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

      {/* Scholarship Filter */}
      <div className="flex gap-4 mb-4">
        {['MNC', 'SSKA'].map((sch) => (
          <button
            key={sch}
            type="button"
            onClick={() => {
              setSelectedScholarship(sch);
              setSelectedAppIds([]);
            }}
            className={`px-4 py-2 text-xs font-bold border ${
              selectedScholarship === sch
                ? 'bg-[#AC3D47] text-white border-[#AC3D47]'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {sch === 'MNC' ? 'MNC Endowment Fund' : 'SSKA Memorial Scholarship'}
          </button>
        ))}
      </div>

      {/* Year Selection Tabs */}
      <div className="flex border border-gray-300 bg-white mb-6">
        {[1, 2, 3, 4].map((yr) => (
          <button
            key={yr}
            type="button"
            onClick={() => {
              setSelectedYear(yr);
              setSelectedAppIds([]);
            }}
            className={`flex-1 py-3 text-xs font-bold border-r last:border-r-0 ${
              selectedYear === yr
                ? 'bg-[#AC3D47] text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Year {yr} B.E. ({applications.filter((a) => (a.data.year_of_study || 1) === yr && (a.data.scholarship_code || 'MNC').toUpperCase() === selectedScholarship).length} Candidates)
          </button>
        ))}
      </div>

      {/* Selection Status Banner */}
      <div className="border border-gray-300 bg-[#EEF1F6] p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <span className="font-bold text-[#AC3D47]">Status for {selectedScholarship} Year {selectedYear} B.E.: </span>
          {currentAwardee ? (
            <span className="text-emerald-800 font-bold">
              ✓ Awardee Finalized: {currentAwardee.data.full_name} ({currentAwardee.ref_no})
            </span>
          ) : (
            <span className="text-amber-800 font-bold">
              Awardee Not Yet Finalized (Committee Evaluation Pending)
            </span>
          )}
        </div>
        <div className="text-gray-600 text-[11px]">
          Target: Exactly 1 recipient selected per study year
        </div>
      </div>

      {/* Top 10 per year Highlight */}
      <div className="border border-gray-300 bg-white mb-8">
        <div className="gov-header-bar flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide">
            Top 10 Roster (Year {selectedYear} B.E.)
          </span>
          <span className="text-xs font-normal text-gray-600">
            Tie-Break Priority: Merit Score Descending → Family Income Ascending (Means)
          </span>
        </div>

        {topTen.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            No submitted applications found for {selectedScholarship} Year {selectedYear} B.E.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-300 text-gray-700">
                  <th className="p-3 font-bold border-r border-gray-200 text-center w-8">
                    <input
                      type="checkbox"
                      aria-label="Select all in top 10"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAppIds(topTen.map((a) => a.id));
                        } else {
                          setSelectedAppIds([]);
                        }
                      }}
                      checked={topTen.length > 0 && topTen.every((a) => selectedAppIds.includes(a.id))}
                    />
                  </th>
                  <th className="p-3 font-bold border-r border-gray-200 text-center w-12">Rank</th>
                  <th className="p-3 font-bold border-r border-gray-200">Ref No.</th>
                  <th className="p-3 font-bold border-r border-gray-200">Candidate Name & USN</th>
                  <th className="p-3 font-bold border-r border-gray-200">Branch</th>
                  <th className="p-3 font-bold border-r border-gray-200">Qualifying Score</th>
                  <th className="p-3 font-bold border-r border-gray-200">Family Income</th>
                  <th className="p-3 font-bold border-r border-gray-200">Recommendation</th>
                  <th className="p-3 font-bold border-r border-gray-200">Status</th>
                  <th className="p-3 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topTen.map((app, index) => {
                  const isAwarded = app.status === 'accepted';
                  const isSelected = selectedAppIds.includes(app.id);

                  return (
                    <tr key={app.id} className={isAwarded ? 'bg-emerald-50' : isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                      <td className="p-3 text-center border-r border-gray-200">
                        <input
                          type="checkbox"
                          aria-label={`Select ${app.ref_no}`}
                          checked={isSelected}
                          onChange={() => toggleSelectApp(app.id)}
                        />
                      </td>
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
                      <td className="p-3 border-r border-gray-200 text-[10px] font-bold">
                        {app.recommendation_status === 'recommended' && (
                          <span className="text-emerald-700">✓ RECOMMENDED</span>
                        )}
                        {app.recommendation_status === 'not_recommended' && (
                          <span className="text-red-700">✗ NOT RECOMMENDED</span>
                        )}
                        {(!app.recommendation_status || app.recommendation_status === 'pending') && (
                          <span className="text-gray-500">PENDING</span>
                        )}
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
                            onClick={() => handleOpenAwardDialog(app)}
                            className="gov-btn bg-emerald-700 text-white hover:bg-emerald-800 text-[11px] py-1 px-2.5 min-h-[28px] font-bold"
                          >
                            Award
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

      {/* Award & Tie-Break Modal */}
      {awardingAppId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#AC3D47] max-w-md w-full p-6 text-xs">
            <h2 className="text-sm font-bold text-[#AC3D47] mb-2 uppercase">
              Confirm Official Awardee Selection
            </h2>
            <p className="text-gray-700 mb-4">
              You are selecting an official award recipient for Year {selectedYear} B.E. under {selectedScholarship}.
            </p>

            <div className="mb-4">
              <label className="block font-bold text-gray-700 mb-1">
                Tie-Break Notes & Committee Justification:
              </label>
              <textarea
                value={currentTieBreakNote}
                onChange={(e) => setCurrentTieBreakNote(e.target.value)}
                placeholder="e.g. Candidates ranked identically; selected based on higher percentage in Mathematics / lower per-capita family income."
                className="w-full border border-gray-300 p-2 text-xs h-24 focus:border-[#AC3D47] focus:outline-none"
              />
              <span className="text-[10px] text-gray-500">
                This will be permanently recorded in the audit trail as a &apos;tie_break&apos; remark.
              </span>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAwardingAppId(null)}
                className="gov-btn gov-btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(processingId)}
                onClick={() => handleConfirmAward(awardingAppId)}
                className="gov-btn bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold"
              >
                {processingId ? 'Processing...' : 'Confirm Award'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
