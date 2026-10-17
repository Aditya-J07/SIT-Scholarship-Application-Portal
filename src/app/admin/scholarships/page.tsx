'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Scholarship, AcademicCycle } from '@/lib/types';

export default function AdminScholarshipsConfigPage() {
  const router = useRouter();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [cycles, setCycles] = useState<AcademicCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingSchId, setEditingSchId] = useState<string | null>(null);
  const [schName, setSchName] = useState('');
  const [schFeeLabel, setSchFeeLabel] = useState('');
  const [schRulesJson, setSchRulesJson] = useState('');

  const loadData = () => {
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
  };

  useEffect(() => {
    loadData();
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
        setMessage('Scholarship active status updated successfully.');
        setErrorMsg(null);
      }
    } catch {
      setErrorMsg('Failed to update scholarship');
    }
  };

  const handleUpdateCycle = async (cycleId: string, opens_at: string, closes_at: string, status: string) => {
    setMessage(null);
    setErrorMsg(null);

    // Validation: A cycle cannot be opened without dates
    if (status === 'open' && (!opens_at || !closes_at)) {
      setErrorMsg('A cycle cannot be opened without both opening and closing dates configured.');
      return;
    }

    if (opens_at && closes_at) {
      if (new Date(closes_at).getTime() <= new Date(opens_at).getTime()) {
        setErrorMsg('Closing date must be strictly after the opening date.');
        return;
      }
    }

    try {
      const res = await fetch('/api/admin/cycles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cycleId,
          opens_at: opens_at ? `${opens_at}T00:00:00Z` : null,
          closes_at: closes_at ? `${closes_at}T23:59:59Z` : null,
          status,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setMessage('Application cycle updated and audited successfully.');
        loadData();
      } else {
        setErrorMsg(resData.error?.message || 'Failed to update cycle');
      }
    } catch {
      setErrorMsg('Network error. Failed to update cycle');
    }
  };

  const handleSaveScholarshipEdit = async (schId: string) => {
    setMessage(null);
    setErrorMsg(null);

    let parsedRules = {};
    try {
      parsedRules = JSON.parse(schRulesJson);
    } catch {
      setErrorMsg('Invalid Rules JSON format.');
      return;
    }

    try {
      const res = await fetch('/api/admin/scholarships', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: schId,
          name: schName.trim(),
          fee_label: schFeeLabel.trim(),
          rules: parsedRules,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setMessage('Scholarship configuration updated and audited successfully.');
        setEditingSchId(null);
        loadData();
      } else {
        setErrorMsg(resData.error?.message || 'Failed to update scholarship');
      }
    } catch {
      setErrorMsg('Network error. Failed to update scholarship');
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
            Configure application windows, income limits, and eligibility toggles dynamically with strict server auditing.
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="border-b border-gray-300 mb-6 flex flex-wrap gap-4 text-xs font-bold text-gray-700">
        <Link href="/admin" className="pb-2 hover:text-[#AC3D47]">Overview</Link>
        <Link href="/admin/applications" className="pb-2 hover:text-[#AC3D47]">All Applications</Link>
        <Link href="/admin/merit" className="pb-2 hover:text-[#AC3D47]">Merit Evaluation Roster</Link>
        <Link href="/admin/scholarships" className="pb-2 border-b-2 border-[#AC3D47] text-[#AC3D47]">Scholarships & Deadlines</Link>
        <Link href="/admin/data-requests" className="pb-2 hover:text-[#AC3D47]">Data Requests</Link>
        <Link href="/admin/users" className="pb-2 hover:text-[#AC3D47]">Staff Users</Link>
        <Link href="/admin/audit" className="pb-2 hover:text-[#AC3D47]">Audit Log</Link>
      </div>

      {message && (
        <div className="mb-4 bg-emerald-50 border border-emerald-300 p-3 text-xs text-emerald-800 font-bold">
          {message}
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 bg-red-50 border border-red-300 p-3 text-xs text-red-800 font-bold">
          {errorMsg}
        </div>
      )}

      {/* Scholarships List */}
      <div className="space-y-6">
        {scholarships.map((sch) => {
          const cycle = cycles.find((c) => c.scholarship_id === sch.id);
          const isEditing = editingSchId === sch.id;

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
                    onClick={() => {
                      if (isEditing) {
                        setEditingSchId(null);
                      } else {
                        setEditingSchId(sch.id);
                        setSchName(sch.name);
                        setSchFeeLabel(sch.fee_label);
                        setSchRulesJson(JSON.stringify(sch.rules, null, 2));
                      }
                    }}
                    className="gov-btn gov-btn-secondary text-xs font-bold py-1.5 px-3"
                  >
                    {isEditing ? 'Cancel Edit' : 'Edit Rules & Name'}
                  </button>
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

              {isEditing ? (
                <div className="bg-gray-50 p-4 border border-gray-300 mb-4 space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Scholarship Title</label>
                    <input
                      type="text"
                      value={schName}
                      onChange={(e) => setSchName(e.target.value)}
                      className="gov-input"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Fee Label</label>
                    <input
                      type="text"
                      value={schFeeLabel}
                      onChange={(e) => setSchFeeLabel(e.target.value)}
                      className="gov-input"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Rules Configuration (JSON)</label>
                    <textarea
                      value={schRulesJson}
                      onChange={(e) => setSchRulesJson(e.target.value)}
                      rows={6}
                      className="gov-input font-mono text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveScholarshipEdit(sch.id)}
                    className="gov-btn gov-btn-primary text-xs"
                  >
                    Save Scholarship Changes
                  </button>
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Rules Summary */}
                <div className="border border-gray-200 p-3 bg-gray-50 space-y-1.5">
                  <div className="font-bold text-[#AC3D47] uppercase tracking-wide">
                    Configured Eligibility Parameters
                  </div>
                  <div>• <strong>Income Limit:</strong> {sch.rules.income_limit ? `Rs. ${sch.rules.income_limit.toLocaleString('en-IN')}` : 'None'}</div>
                  <div>• <strong>CET Required:</strong> {sch.rules.cet_required ? 'Yes (CET quota only)' : 'No'}</div>
                  <div>• <strong>Max Assistance Pct:</strong> {sch.rules.max_assistance_pct || 30}% of annual fee</div>
                  <div>• <strong>Zero Backlogs Required:</strong> {sch.rules.allow_backlog === false ? 'Yes' : 'No'}</div>
                  <div>• <strong>Faculty Recommendation Required:</strong> {sch.requires_recommendation ? 'Yes (SSKA block)' : 'No'}</div>
                  <div>• <strong>Required Documents:</strong> {sch.rules.required_documents?.length || 9} Enclosures</div>
                </div>

                {/* Application Window / Cycle */}
                {cycle && (
                  <div className="border border-gray-200 p-3 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-[#AC3D47] uppercase tracking-wide">
                        Cycle Window ({cycle.academic_year})
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 border ${
                        cycle.status === 'open'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : cycle.status === 'upcoming'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-gray-100 text-gray-800 border-gray-300'
                      }`}>
                        {cycle.status}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-600 mb-0.5">Cycle Status:</label>
                      <select
                        id={`status-${cycle.id}`}
                        defaultValue={cycle.status}
                        className="gov-input text-xs py-1"
                      >
                        <option value="closed">Closed (Submissions Blocked)</option>
                        <option value="open">Open (Active Submission Window)</option>
                        <option value="upcoming">Upcoming</option>
                      </select>
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
                        const statusSelect = (document.getElementById(`status-${cycle.id}`) as HTMLSelectElement)?.value;
                        const openInput = (document.getElementById(`open-${cycle.id}`) as HTMLInputElement)?.value;
                        const closeInput = (document.getElementById(`close-${cycle.id}`) as HTMLInputElement)?.value;
                        handleUpdateCycle(cycle.id, openInput, closeInput, statusSelect);
                      }}
                      className="gov-btn gov-btn-secondary text-[11px] py-1.5 px-3 w-full"
                    >
                      Update Cycle & Dates
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
