'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuditRecord } from '@/lib/types';

export default function AdminAuditLogPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/audit')
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then((data) => {
        setLogs(data.logs || []);
        setLoading(false);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-xs text-gray-600">
        Loading audit logs...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Compliance & Security
          </div>
          <h1 className="text-xl font-bold text-[#AC3D47]">
            Immutable System Audit Trail
          </h1>
          <div className="text-xs text-gray-600">
            Chronological audit log for DPDP Act compliance, submission verification, and decisions.
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="border-b border-gray-300 mb-6 flex gap-4 text-xs font-bold text-gray-700">
        <Link href="/admin" className="pb-2 hover:text-[#AC3D47]">Overview</Link>
        <Link href="/admin/applications" className="pb-2 hover:text-[#AC3D47]">All Applications</Link>
        <Link href="/admin/merit" className="pb-2 hover:text-[#AC3D47]">Merit Evaluation Roster</Link>
        <Link href="/admin/scholarships" className="pb-2 hover:text-[#AC3D47]">Scholarships & Deadlines</Link>
        <Link href="/admin/users" className="pb-2 hover:text-[#AC3D47]">Staff Users</Link>
        <Link href="/admin/audit" className="pb-2 border-b-2 border-[#AC3D47] text-[#AC3D47]">Audit Log</Link>
      </div>

      {/* Audit Log Table */}
      <div className="border border-gray-300 bg-white">
        <div className="gov-header-bar flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide">
            Audit Events ({logs.length})
          </span>
          <span className="text-[11px] font-normal text-gray-600">
            Recorded in Local Storage with UTC Timestamps
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-300 text-gray-700 font-sans">
                <th className="p-3 font-bold border-r border-gray-200">Timestamp</th>
                <th className="p-3 font-bold border-r border-gray-200">Actor</th>
                <th className="p-3 font-bold border-r border-gray-200">Action</th>
                <th className="p-3 font-bold border-r border-gray-200">Target Entity</th>
                <th className="p-3 font-bold">Metadata Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-[11px]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="p-2.5 text-gray-600 border-r border-gray-200 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('en-IN')}
                  </td>
                  <td className="p-2.5 font-bold text-gray-800 border-r border-gray-200">
                    {log.actor_email || log.actor_id || 'SYSTEM'}
                  </td>
                  <td className="p-2.5 font-bold text-[#AC3D47] border-r border-gray-200">
                    {log.action}
                  </td>
                  <td className="p-2.5 text-gray-700 border-r border-gray-200">
                    {log.entity}:{log.entity_id}
                  </td>
                  <td className="p-2.5 text-gray-600 truncate max-w-xs">
                    {log.meta ? JSON.stringify(log.meta) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
