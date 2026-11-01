'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApplicationRecord, Scholarship, ApplicationFileRecord, RemarkRecord } from '@/lib/types';

interface TimelineStep {
  status: string;
  label: string;
  date?: string;
  note?: string;
  active: boolean;
  completed: boolean;
}

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [files, setFiles] = useState<ApplicationFileRecord[]>([]);
  const [remarks, setRemarks] = useState<RemarkRecord[]>([]);
  const [timeline, setTimeline] = useState<TimelineStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((sess) => {
        if (!sess.authenticated) {
          router.push('/login');
          return;
        }

        fetch(`/api/applications/${id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.error) {
              router.push('/dashboard');
              return;
            }
            setApplication(data.application);
            setScholarship(data.scholarship);
            setFiles(data.files || []);
            setRemarks(data.remarks || []);
            setTimeline(data.timeline || []);
            setLoading(false);
          })
          .catch(() => router.push('/dashboard'));
      });
  }, [id, router]);

  const handleWithdraw = async () => {
    if (!confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) {
      return;
    }

    setWithdrawing(true);
    try {
      const res = await fetch(`/api/applications/${id}/withdraw`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setApplication(data.application);
      }
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading || !application) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-xs text-gray-600">
        Loading application details...
      </div>
    );
  }

  const appData = application.data || {};

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs text-gray-500 flex items-center gap-1.5">
        <Link href="/dashboard" className="hover:text-[#AC3D47]">Dashboard</Link>
        <span>/</span>
        <span className="text-[#AC3D47] font-semibold">{application.ref_no}</span>
      </nav>

      {/* Header Overview Card */}
      <div className="border border-gray-300 bg-white p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <span className="font-mono text-xs font-bold text-[#AC3D47] bg-[#EEF1F6] px-2.5 py-1 border border-gray-300">
              REF: {application.ref_no}
            </span>
            <h1 className="text-xl font-bold text-[#AC3D47] mt-2">
              {scholarship?.name}
            </h1>
            <div className="text-xs text-gray-600">
              Submitted by <strong>{appData.full_name}</strong> (USN: {appData.usn}) on {application.submitted_at ? new Date(application.submitted_at).toLocaleDateString('en-IN') : 'N/A'}
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2 no-print">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="gov-btn gov-btn-outline text-xs font-bold py-2 px-3"
                title="Print this page via browser"
              >
                🖨️ Print Page
              </button>
              <a
                href={`/api/applications/${application.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="gov-btn gov-btn-primary text-xs font-bold py-2 px-4"
              >
                📥 Download Stored PDF
              </a>
            </div>
            {application.pdf_sha256 && (
              <span className="text-[10px] font-mono text-gray-500">
                SHA-256: {application.pdf_sha256.substring(0, 16)}...
              </span>
            )}
          </div>
        </div>

        {/* Status Timeline (Part 4 Item 1) */}
        <div className="border-t border-gray-200 pt-5 mt-4">
          <div className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center justify-between">
            <span>Application Lifecycle & Scrutiny Timeline</span>
            <span className="text-[11px] font-normal text-gray-500">
              Current Status: <strong className="uppercase font-mono text-[#AC3D47]">{application.status.replace('_', ' ')}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
            {timeline.length > 0 ? (
              timeline.map((stepItem, idx) => (
                <div
                  key={stepItem.status}
                  className={`p-2.5 border text-left flex flex-col justify-between ${
                    stepItem.active
                      ? 'bg-blue-50 border-blue-500 text-blue-950 font-medium'
                      : stepItem.completed
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                      : 'bg-gray-50 border-gray-300 text-gray-500'
                  }`}
                >
                  <div>
                    <div className="font-bold flex items-center gap-1">
                      <span>{stepItem.completed ? '✓' : stepItem.active ? '●' : `${idx + 1}.`}</span>
                      <span>{stepItem.label}</span>
                    </div>
                    {stepItem.note && (
                      <div className="text-[10px] text-gray-700 mt-1 line-clamp-2">
                        {stepItem.note}
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-600 mt-2 font-mono">
                    {stepItem.date ? new Date(stepItem.date).toLocaleDateString('en-IN') : 'Pending'}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center text-gray-500 text-xs py-2">Loading timeline...</div>
            )}
          </div>

          {/* Department Recommendation Status (Item 6) */}
          <div className="mt-3 p-2.5 bg-gray-50 border border-gray-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-gray-700">Department / Proctor Recommendation: </span>
              <span className={`font-bold uppercase font-mono ${
                application.recommendation_status === 'recommended'
                  ? 'text-emerald-700'
                  : application.recommendation_status === 'not_recommended'
                  ? 'text-red-700'
                  : 'text-amber-700'
              }`}>
                {application.recommendation_status || 'Pending Review'}
              </span>
            </div>
            {scholarship?.requires_recommendation && (
              <span className="text-[10px] text-gray-500 italic">
                Mandatory for {scholarship.code} scholarship final award
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Needs Correction Alert (Part 4 Item 2) */}
      {application.status === 'needs_correction' && (
        <div className="bg-amber-50 border-2 border-amber-400 p-5 mb-6 text-xs text-amber-950" role="alert" aria-live="assertive">
          <div className="flex items-center gap-2 font-bold text-sm mb-2 text-amber-900">
            <span className="text-base">⚠️</span>
            <span>Scrutiny Committee Notice: Corrections Requested</span>
          </div>
          <div className="bg-white border border-amber-300 p-3 mb-3 text-xs text-gray-800">
            <div className="text-[11px] font-bold text-gray-600 uppercase mb-1">Committee Message:</div>
            <p className="font-medium whitespace-pre-wrap">
              {remarks.find((r) => r.kind === 'correction_request' || r.visible_to_student)?.body ||
                'The scholarship reviewer has flagged your application for corrections. Please review the missing or incomplete information and resubmit.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/apply/${appData.scholarship_code || 'MNC'}`}
              className="gov-btn gov-btn-primary text-xs py-2 px-4 font-bold shadow-none"
            >
              ✏️ Edit and Resubmit Application →
            </Link>
            <span className="text-[11px] text-amber-800">
              Your previous draft data is preserved.
            </span>
          </div>
        </div>
      )}

      {/* Reviewer Remarks Thread */}
      {remarks.length > 0 && (
        <div className="border border-gray-300 bg-white mb-6">
          <div className="gov-header-bar text-xs">
            Official Committee Remarks & Scrutiny Notes
          </div>
          <div className="divide-y divide-gray-200 p-4 text-xs">
            {remarks.map((r) => (
              <div key={r.id} className="py-2.5">
                <div className="flex items-center justify-between text-gray-500 text-[11px] mb-1">
                  <span className="font-bold text-[#AC3D47]">
                    {r.author_name} ({r.author_role.toUpperCase()})
                  </span>
                  <span>{new Date(r.created_at).toLocaleString('en-IN')}</span>
                </div>
                <div className="text-gray-800 bg-gray-50 p-2.5 border border-gray-200">
                  {r.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Application Form Summary */}
      <div className="border border-gray-300 bg-white mb-6">
        <div className="gov-header-bar text-xs">
          Submitted Application Summary
        </div>
        <div className="p-4 text-xs divide-y divide-gray-200">
          <div className="py-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div><span className="text-gray-500">Student Name:</span> <span className="font-bold">{appData.full_name}</span></div>
            <div><span className="text-gray-500">USN:</span> <span className="font-mono font-bold">{appData.usn}</span></div>
            <div><span className="text-gray-500">DOB:</span> <span>{appData.dob}</span></div>
            <div><span className="text-gray-500">Father&apos;s Name:</span> <span>{appData.father_or_guardian_name}</span></div>
            <div><span className="text-gray-500">Parent Occupation:</span> <span>{appData.parent_occupation}</span></div>
            <div><span className="text-gray-500">Annual Family Income:</span> <span className="font-bold text-[#AC3D47]">Rs. {(appData.family_annual_income || 0).toLocaleString('en-IN')}</span></div>
          </div>

          <div className="py-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div><span className="text-gray-500">Course:</span> <span>{appData.course}</span></div>
            <div><span className="text-gray-500">Year / Semester:</span> <span>Year {appData.year_of_study}, Sem {appData.semester}</span></div>
            <div><span className="text-gray-500">CET Quota:</span> <span className="font-bold">{appData.admitted_through_cet ? 'Yes' : 'No'}</span></div>
            <div><span className="text-gray-500">Marks:</span> <span className="font-mono">{appData.marks_obtained} / {appData.marks_gross_total} ({appData.percentage}%)</span></div>
            {appData.cgpa && <div><span className="text-gray-500">CGPA:</span> <span className="font-mono font-bold">{appData.cgpa} / 10.0</span></div>}
            <div><span className="text-gray-500">Merit Score:</span> <span className="font-mono font-bold text-[#AC3D47]">{application.merit_score}</span></div>
          </div>

          <div className="py-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div><span className="text-gray-500">Annual Fee:</span> <span>Rs. {(appData.annual_fee || 0).toLocaleString('en-IN')}</span></div>
            <div><span className="text-gray-500">Scholarship Requested:</span> <span className="font-bold text-[#AC3D47]">Rs. {(appData.scholarship_amount_required_per_month || 0).toLocaleString('en-IN')} / mo</span></div>
            <div><span className="text-gray-500">Bank Account:</span> <span className="font-mono">{appData.bank_acc_no}</span></div>
            <div><span className="text-gray-500">Bank & Branch:</span> <span>{appData.bank_name}, {appData.bank_branch}</span></div>
            <div><span className="text-gray-500">IFSC:</span> <span className="font-mono uppercase">{appData.bank_ifsc}</span></div>
          </div>
        </div>
      </div>

      {/* Uploaded Documents List */}
      <div className="border border-gray-300 bg-white mb-6">
        <div className="gov-header-bar text-xs">
          Archived Enclosures ({files.length} Files)
        </div>
        <div className="p-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {files.map((file) => (
              <div key={file.id} className="border border-gray-200 p-2.5 flex items-center justify-between bg-gray-50">
                <div className="overflow-hidden">
                  <div className="font-bold text-gray-800 truncate">{file.original_name}</div>
                  <div className="text-[10px] text-gray-500 uppercase">{file.kind} • {Math.round(file.size_bytes / 1024)} KB</div>
                </div>
                <a
                  href={file.url || `/api/files/${file.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gov-btn gov-btn-outline text-[11px] py-1 px-2.5 min-h-[28px]"
                >
                  View File
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Embedded PDF Viewer */}
      <div className="border border-gray-300 bg-white mb-6">
        <div className="gov-header-bar text-xs flex items-center justify-between">
          <span>Official PDF Preview</span>
          <a
            href={`/api/applications/${application.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#AC3D47] underline font-semibold"
          >
            Open in new tab ↗
          </a>
        </div>
        <div className="p-2 bg-gray-100 flex justify-center">
          <iframe
            src={`/api/applications/${application.id}/pdf`}
            className="w-full h-[600px] border border-gray-300 bg-white"
            title="Application Official PDF"
          />
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between border-t border-gray-300 pt-4">
        <Link href="/dashboard" className="gov-btn gov-btn-secondary text-xs">
          ← Back to Dashboard
        </Link>

        {['submitted', 'under_review'].includes(application.status) && (
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={withdrawing}
            className="gov-btn gov-btn-outline text-xs text-red-700 border-red-300 hover:bg-red-50"
          >
            {withdrawing ? 'Processing...' : 'Withdraw Application'}
          </button>
        )}
      </div>
    </div>
  );
}
