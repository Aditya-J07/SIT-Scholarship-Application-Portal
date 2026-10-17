'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminApplicationsTablePage() {
  const router = useRouter();
  const [applications, setApplications] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [scholarshipFilter, setScholarshipFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sortBy, setSortBy] = useState('merit');
  const [order, setOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [zipPage, setZipPage] = useState(1);

  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, scholarshipFilter, statusFilter, yearFilter, sortBy, order]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search,
        scholarship: scholarshipFilter,
        status: statusFilter,
        year: yearFilter,
        sortBy,
        order,
      });

      const res = await fetch(`/api/admin/applications?${params.toString()}`);
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setApplications(data.applications || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchApplications();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 font-bold uppercase text-[10px]">Sanctioned</span>;
      case 'shortlisted':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.5 font-bold uppercase text-[10px]">Shortlisted</span>;
      case 'needs_correction':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 font-bold uppercase text-[10px]">Correction</span>;
      case 'submitted':
        return <span className="bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 font-bold uppercase text-[10px]">Submitted</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 font-bold uppercase text-[10px]">Rejected</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 border border-gray-300 px-2 py-0.5 font-bold uppercase text-[10px]">Draft</span>;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Title & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Scrutiny & Review Table
          </div>
          <h1 className="text-xl font-bold text-[#AC3D47]">
            Scholarship Applications Repository
          </h1>
        </div>

        <div className="flex flex-col sm:items-end gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/admin/export?format=csv&scholarship=${scholarshipFilter}&status=${statusFilter}`}
              className="gov-btn gov-btn-secondary text-xs"
            >
              Export Filtered CSV
            </a>
            <div className="flex items-center gap-1.5">
              <a
                href={`/api/admin/export?format=zip&scholarship=${scholarshipFilter}&status=${statusFilter}&page=${zipPage}`}
                className="gov-btn gov-btn-outline text-xs"
                title="Download applications batch (max 15 PDFs per ZIP)"
              >
                Download PDFs (ZIP: Part {zipPage})
              </a>
              {Math.ceil(total / 15) > 1 && (
                <select
                  value={zipPage}
                  onChange={(e) => setZipPage(Number(e.target.value))}
                  className="gov-input text-xs py-1 px-1.5 h-[32px] w-auto border-gray-400"
                  aria-label="Select ZIP batch part"
                >
                  {Array.from({ length: Math.ceil(total / 15) }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p}>
                      Part {p} ({((p - 1) * 15) + 1}–{Math.min(p * 15, total)})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <span className="text-[10px] text-gray-500 text-right">
            ZIP exports are limited to 15 PDFs per request to comply with Vercel&apos;s 4.5 MB response body limit.
          </span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="border-b border-gray-300 mb-6 flex gap-4 text-xs font-bold text-gray-700">
        <Link href="/admin" className="pb-2 hover:text-[#AC3D47]">
          Overview
        </Link>
        <Link href="/admin/applications" className="pb-2 border-b-2 border-[#AC3D47] text-[#AC3D47]">
          All Applications
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

      {/* Filter and Search Bar */}
      <div className="border border-gray-300 bg-white p-4 mb-6">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          {/* Search Input */}
          <div className="lg:col-span-2">
            <label className="block font-bold text-gray-700 mb-1">Search Candidate</label>
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="Name, USN, Mobile, Ref No."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="gov-input text-xs"
              />
              <button type="submit" className="gov-btn gov-btn-primary px-3 text-xs">
                Search
              </button>
            </div>
          </div>

          {/* Scholarship Filter */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Scholarship</label>
            <select
              value={scholarshipFilter}
              onChange={(e) => { setScholarshipFilter(e.target.value); setPage(1); }}
              className="gov-input text-xs"
            >
              <option value="">All Schemes</option>
              <option value="MNC">MNC Endowment</option>
              <option value="SSKA">SSKA Memorial</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="gov-input text-xs"
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="needs_correction">Needs Correction</option>
              <option value="accepted">Sanctioned</option>
              <option value="rejected">Rejected</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {/* Year of Study Filter */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Year of Study</label>
            <select
              value={yearFilter}
              onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
              className="gov-input text-xs"
            >
              <option value="">All Years</option>
              <option value="1">Year 1 B.E.</option>
              <option value="2">Year 2 B.E.</option>
              <option value="3">Year 3 B.E.</option>
              <option value="4">Year 4 B.E.</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Sort Metric</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="gov-input text-xs font-semibold"
            >
              <option value="merit">Merit Score (Desc)</option>
              <option value="income">Income (Means)</option>
              <option value="date">Submission Date</option>
            </select>
          </div>
        </form>
      </div>

      {/* Applications Data Table */}
      <div className="border border-gray-300 bg-white">
        <div className="gov-header-bar flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide">
            Found {total} Application(s)
          </span>
          <span className="text-xs font-normal text-gray-600">
            Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-gray-600">
            Fetching records...
          </div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-600">
            No applications match the selected search and filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-300 text-gray-700">
                  <th className="p-3 font-bold border-r border-gray-200">Ref No.</th>
                  <th className="p-3 font-bold border-r border-gray-200">Candidate Name & USN</th>
                  <th className="p-3 font-bold border-r border-gray-200">Scheme</th>
                  <th className="p-3 font-bold border-r border-gray-200">Year / Sem</th>
                  <th className="p-3 font-bold border-r border-gray-200">Annual Income</th>
                  <th className="p-3 font-bold border-r border-gray-200">Score / CGPA</th>
                  <th className="p-3 font-bold border-r border-gray-200">Merit Score</th>
                  <th className="p-3 font-bold border-r border-gray-200">Status & Flags</th>
                  <th className="p-3 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {applications.map((app) => {
                  const flags = app.computed?.eligibility_flags || {};
                  const hasBacklog = app.data.has_backlog_history;
                  const isHighIncome = (app.data.family_annual_income || 0) > 300000;

                  return (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="p-3 font-mono font-bold text-[#AC3D47] border-r border-gray-200 whitespace-nowrap">
                        <Link href={`/admin/applications/${app.id}`} className="hover:underline">
                          {app.ref_no}
                        </Link>
                      </td>
                      <td className="p-3 border-r border-gray-200">
                        <div className="font-bold text-gray-900">{app.data.full_name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          USN: {app.data.usn || 'N/A'} • {app.data.mobile}
                        </div>
                      </td>
                      <td className="p-3 border-r border-gray-200 font-mono font-bold text-gray-700">
                        {app.data.scholarship_code}
                      </td>
                      <td className="p-3 border-r border-gray-200">
                        Year {app.data.year_of_study || 1}, Sem {app.data.semester || 1}
                      </td>
                      <td className="p-3 border-r border-gray-200 font-mono">
                        Rs. {(app.data.family_annual_income || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 border-r border-gray-200 font-mono">
                        {app.data.year_of_study === 1 ? (
                          <span>{app.computed?.percentage || app.data.percentage}%</span>
                        ) : (
                          <span>{app.data.cgpa ? `${app.data.cgpa} CGPA` : `${app.data.percentage}%`}</span>
                        )}
                      </td>
                      <td className="p-3 border-r border-gray-200 font-mono font-bold text-[#AC3D47] text-sm">
                        {app.merit_score ? app.merit_score.toFixed(2) : '0.00'}
                      </td>
                      <td className="p-3 border-r border-gray-200">
                        <div className="mb-1">{getStatusBadge(app.status)}</div>
                        {/* Audit Flag Chips */}
                        <div className="flex flex-wrap gap-1">
                          {isHighIncome && (
                            <span className="bg-red-50 text-red-700 border border-red-300 text-[9px] px-1 py-0.5">
                              Income &gt; 3L
                            </span>
                          )}
                          {hasBacklog && (
                            <span className="bg-red-50 text-red-700 border border-red-300 text-[9px] px-1 py-0.5">
                              Backlog
                            </span>
                          )}
                          {app.hard_copy_received && (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 text-[9px] px-1 py-0.5">
                              Hard Copy ✓
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <Link
                          href={`/admin/applications/${app.id}`}
                          className="gov-btn gov-btn-primary text-[11px] py-1 px-3 min-h-[30px]"
                        >
                          Scrutinize
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {total > pageSize && (
          <div className="p-4 bg-gray-50 border-t border-gray-300 flex items-center justify-between text-xs">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="gov-btn gov-btn-secondary text-xs disabled:opacity-40"
            >
              ← Previous Page
            </button>
            <span className="text-gray-600 font-medium">
              Page {page} of {Math.ceil(total / pageSize)}
            </span>
            <button
              type="button"
              disabled={page >= Math.ceil(total / pageSize)}
              onClick={() => setPage(page + 1)}
              className="gov-btn gov-btn-secondary text-xs disabled:opacity-40"
            >
              Next Page →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
