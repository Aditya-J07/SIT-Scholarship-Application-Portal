'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataRequestRecord } from '@/lib/types';

export default function AdminDataRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<DataRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = useCallback(() => {
    fetch('/api/admin/data-requests')
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then((data) => {
        setRequests(data.requests || []);
        setLoading(false);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleUpdateStatus = async (id: string, status: 'resolved' | 'rejected' | 'in_progress') => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/data-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          admin_notes: adminNote.trim() || undefined,
        }),
      });

      if (res.ok) {
        setResolvingId(null);
        setAdminNote('');
        loadRequests();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error?.message || 'Failed to update'}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter((r) =>
    selectedStatus === 'all' ? true : r.status === selectedStatus
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-xs text-gray-600">
        Loading DPDP data requests...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            DPDP Act 2023 Compliance
          </div>
          <h1 className="text-xl font-bold text-[#AC3D47]">
            Student Data Rights Requests
          </h1>
          <div className="text-xs text-gray-600">
            Review, investigate, and resolve student correction and deletion requests.
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="border-b border-gray-300 mb-6 flex flex-wrap gap-4 text-xs font-bold text-gray-700">
        <Link href="/admin" className="pb-2 hover:text-[#AC3D47]">Overview</Link>
        <Link href="/admin/applications" className="pb-2 hover:text-[#AC3D47]">All Applications</Link>
        <Link href="/admin/merit" className="pb-2 hover:text-[#AC3D47]">Merit Evaluation Roster</Link>
        <Link href="/admin/scholarships" className="pb-2 hover:text-[#AC3D47]">Scholarships & Deadlines</Link>
        <Link href="/admin/data-requests" className="pb-2 border-b-2 border-[#AC3D47] text-[#AC3D47]">Data Requests</Link>
        <Link href="/admin/users" className="pb-2 hover:text-[#AC3D47]">Staff Users</Link>
        <Link href="/admin/audit" className="pb-2 hover:text-[#AC3D47]">Audit Log</Link>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 mb-6">
        {['all', 'pending', 'in_progress', 'resolved', 'rejected'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setSelectedStatus(st)}
            className={`px-3 py-1.5 text-xs font-bold border uppercase ${
              selectedStatus === st
                ? 'bg-[#AC3D47] text-white border-[#AC3D47]'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {st.replace('_', ' ')} ({requests.filter((r) => (st === 'all' ? true : r.status === st)).length})
          </button>
        ))}
      </div>

      {/* Requests Table */}
      <div className="border border-gray-300 bg-white">
        <div className="gov-header-bar flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide">
            Registered Data Requests ({filteredRequests.length})
          </span>
          <span className="text-[10px] text-gray-500">
            Append-only audit trail enforced
          </span>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            No data requests found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-300 text-gray-700">
                  <th className="p-3 font-bold border-r border-gray-200">Date</th>
                  <th className="p-3 font-bold border-r border-gray-200">Type</th>
                  <th className="p-3 font-bold border-r border-gray-200">Student Ref/Email</th>
                  <th className="p-3 font-bold border-r border-gray-200">Details</th>
                  <th className="p-3 font-bold border-r border-gray-200">Status</th>
                  <th className="p-3 font-bold border-r border-gray-200">Admin Notes</th>
                  <th className="p-3 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="p-3 font-mono border-r border-gray-200 whitespace-nowrap">
                      {new Date(req.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-3 font-bold uppercase border-r border-gray-200">
                      <span className={req.request_type === 'deletion' ? 'text-red-700' : 'text-blue-700'}>
                        {req.request_type}
                      </span>
                    </td>
                    <td className="p-3 font-mono border-r border-gray-200">
                      {req.student_email}
                    </td>
                    <td className="p-3 border-r border-gray-200 max-w-xs">
                      {req.details}
                    </td>
                    <td className="p-3 border-r border-gray-200 font-bold uppercase text-[10px]">
                      <span className={
                        req.status === 'resolved'
                          ? 'text-emerald-700'
                          : req.status === 'rejected'
                          ? 'text-red-700'
                          : req.status === 'in_progress'
                          ? 'text-amber-700'
                          : 'text-gray-600'
                      }>
                        {req.status}
                      </span>
                    </td>
                    <td className="p-3 border-r border-gray-200 text-gray-600 max-w-xs">
                      {req.admin_notes || '—'}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {['pending', 'in_progress'].includes(req.status) ? (
                        <button
                          type="button"
                          onClick={() => {
                            setResolvingId(req.id);
                            setAdminNote(req.admin_notes || '');
                          }}
                          className="gov-btn gov-btn-secondary text-[11px] py-1 px-2.5 min-h-[28px]"
                        >
                          Resolve / Update
                        </button>
                      ) : (
                        <span className="text-gray-400 font-bold text-[10px]">CLOSED</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {resolvingId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#AC3D47] max-w-md w-full p-6 text-xs">
            <h2 className="text-sm font-bold text-[#AC3D47] mb-2 uppercase">
              Resolve Student Data Request
            </h2>
            <div className="mb-4">
              <label className="block font-bold text-gray-700 mb-1">
                Admin Notes / Decision Justification:
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="State actions taken to verify or correct the record."
                className="w-full border border-gray-300 p-2 text-xs h-24 focus:border-[#AC3D47] focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResolvingId(null)}
                className="gov-btn gov-btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleUpdateStatus(resolvingId, 'rejected')}
                className="gov-btn bg-red-700 text-white hover:bg-red-800 text-xs font-bold"
              >
                Reject Request
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleUpdateStatus(resolvingId, 'resolved')}
                className="gov-btn bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold"
              >
                Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
