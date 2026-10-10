'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminScholarshipsConfigPage() {
  const router = useRouter();
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/scholarships')
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then((data) => {
        setScholarships(data.scholarships || []);
        setCycles(data.cycles || []);
        setLoading(false);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const handleToggleActive = async (schId: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/admin/scholarships', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: schId, active: !currentActive }),
      });
      if (res.ok) {
        setScholarships((prev) =>
          prev.map((s) => (s.id === schId ? { ...s, active: !currentActive } : s))
        );
        setMessage('Scholarship status updated successfully.');
      }
    } catch {
      alert('Failed to update scholarship');
    }
  };

  const handleUpdateCycleDates = async (cycleId: string, opens_at: string, closes_at: string) => {
    try {
      const res = await fetch('/api/admin/cycles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cycleId, opens_at, closes_at }),
      });
      if (res.ok) {
        setMessage('Application cycle dates saved successfully.');
      }
    } catch {
      alert('Failed to update cycle');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-xs text-gray-600">
        Loading scholarship configurations...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Portal Configuration
          </div>
          <h1 className="text-xl font-bold text-[#AC3D47]">
            Manage Scholarships, Deadlines & Rules
          </h1>
          <div className="text-xs text-gray-600">
            Configure application windows, income limits, and eligibility toggles dynamically.
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="border-b border-gray-300 mb-6 flex gap-4 text-xs font-bold text-gray-700">
        <Link href="/admin" className="pb-2 hover:text-[#AC3D47]">Overview</Link>
        <Link href="/admin/applications" className="pb-2 hover:text-[#AC3D47]">All Applications</Link>
        <Link href="/admin/merit" className="pb-2 hover:text-[#AC3D47]">Merit Evaluation Roster</Link>
        <Link href="/admin/scholarships" className="pb-2 border-b-2 border-[#AC3D47] text-[#AC3D47]">Scholarships & Deadlines</Link>
        <Link href="/admin/users" className="pb-2 hover:text-[#AC3D47]">Staff Users</Link>
        <Link href="/admin/audit" className="pb-2 hover:text-[#AC3D47]">Audit Log</Link>
      </div>

      {message && (
        <div className="mb-4 bg-emerald-50 border border-emerald-300 p-3 text-xs text-emerald-800 font-bold">
          {message}
        </div>
      )}

      {/* Scholarships List */}
      <div className="space-y-6">
        {scholarships.map((sch) => {
          const cycle = cycles.find((c) => c.scholarship_id === sch.id);

          return (
            <div key={sch.id} className="gov-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-[#EEF1F6] text-[#AC3D47] px-2 py-0.5 border border-gray-300">
                      {sch.code}
                    </span>
                    <h2 className="font-bold text-base text-[#AC3D47]">{sch.name}</h2>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Fee Label on Form: <span className="font-semibold text-gray-700">&quot;{sch.fee_label}&quot;</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(sch.id, sch.active)}
                    className={`gov-btn text-xs font-bold py-1.5 px-3 ${
                      sch.active ? 'bg-red-700 text-white hover:bg-red-800' : 'bg-emerald-700 text-white hover:bg-emerald-800'
                    }`}
                  >
                    {sch.active ? 'Deactivate Scheme' : 'Activate Scheme'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Rules Summary */}
                <div className="border border-gray-200 p-3 bg-gray-50 space-y-1.5">
                  <div className="font-bold text-[#AC3D47] uppercase tracking-wide">
                    Configured Eligibility Parameters (JSON)
                  </div>
                  <div>• <strong>Income Limit:</strong> {sch.rules.income_limit ? `Rs. ${sch.rules.income_limit.toLocaleString('en-IN')}` : 'None'}</div>
                  <div>• <strong>CET Required:</strong> {sch.rules.cet_required ? 'Yes (CET quota only)' : 'No'}</div>
                  <div>• <strong>Max Assistance Pct:</strong> {sch.rules.max_assistance_pct || 30}% of annual fee</div>
                  <div>• <strong>Zero Backlogs Required:</strong> {sch.rules.allow_backlog === false ? 'Yes' : 'No'}</div>
                  <div>• <strong>Faculty Recommendation Required:</strong> {sch.requires_recommendation ? 'Yes (SSKA block)' : 'No'}</div>
                </div>

                {/* Application Window / Cycle */}
                {cycle && (
                  <div className="border border-gray-200 p-3 bg-white space-y-2">
                    <div className="font-bold text-[#AC3D47] uppercase tracking-wide">
                      Cycle Window ({cycle.academic_year})
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-0.5">Window Opens At:</label>
                      <input
                        type="date"
                        defaultValue={cycle.opens_at ? cycle.opens_at.split('T')[0] : ''}
                        id={`open-${cycle.id}`}
                        className="gov-input text-xs py-1"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-0.5">Window Closes At (Deadline):</label>
                      <input
                        type="date"
                        defaultValue={cycle.closes_at ? cycle.closes_at.split('T')[0] : ''}
                        id={`close-${cycle.id}`}
                        className="gov-input text-xs py-1"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const openInput = (document.getElementById(`open-${cycle.id}`) as HTMLInputElement)?.value;
                        const closeInput = (document.getElementById(`close-${cycle.id}`) as HTMLInputElement)?.value;
                        if (openInput && closeInput) {
                          handleUpdateCycleDates(cycle.id, `${openInput}T00:00:00Z`, `${closeInput}T23:59:59Z`);
                        }
                      }}
                      className="gov-btn gov-btn-secondary text-[11px] py-1 px-3 w-full"
                    >
                      Update Window Dates
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
