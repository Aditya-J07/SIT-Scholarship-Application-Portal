'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [application, setApplication] = useState<any>(null);
  const [scholarship, setScholarship] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [remarks, setRemarks] = useState<any[]>([]);
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

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-xs text-gray-600">
        Loading application details...
      </div>
    );
  }

  const appData = application?.data || {};
  const statusSteps = ['submitted', 'under_review', 'shortlisted', 'accepted'];
  const currentStatusIdx = statusSteps.indexOf(application.status);

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

          <div className="flex flex-col sm:items-end gap-2">
            <a
              href={`/api/applications/${application.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="gov-btn gov-btn-primary text-xs font-bold py-2 px-4"
            >
              📥 Download / Print Official PDF
            </a>
            {application.pdf_sha256 && (
              <span className="text-[10px] font-mono text-gray-500">
                SHA-256: {application.pdf_sha256.substring(0, 16)}...
              </span>
            )}
          </div>
        </div>

        {/* Status Timeline */}
        <div className="border-t border-gray-200 pt-5 mt-4">
          <div className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
            Application Lifecycle & Scrutiny Timeline
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className={`p-2.5 border ${application.status !== 'draft' ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : 'bg-gray-50 border-gray-300'}`}>
              <div className="font-bold">1. Submitted</div>
              <div className="text-[10px] text-gray-600">
                {application.submitted_at ? new Date(application.submitted_at).toLocaleDateString() : 'Pending'}
              </div>
            </div>

            <div className={`p-2.5 border ${currentStatusIdx >= 1 || application.status === 'under_review' ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : 'bg-gray-50 border-gray-300'}`}>
              <div className="font-bold">2. Under Review</div>
              <div className="text-[10px] text-gray-600">Documents Verification</div>
            </div>

            <div className={`p-2.5 border ${currentStatusIdx >= 2 || application.status === 'shortlisted' ? 'bg-blue-50 border-blue-400 text-blue-800' : 'bg-gray-50 border-gray-300'}`}>
              <div className="font-bold">3. Committee Scrutiny</div>
              <div className="text-[10px] text-gray-600">Merit & Means Evaluation</div>
            </div>

            <div className={`p-2.5 border ${application.status === 'accepted' ? 'bg-emerald-600 text-white border-emerald-600' : application.status === 'rejected' ? 'bg-red-600 text-white border-red-600' : 'bg-gray-50 border-gray-300'}`}>
              <div className="font-bold">4. Final Award</div>
              <div className="text-[10px] opacity-80">
                {application.status === 'accepted' ? 'Approved' : application.status === 'rejected' ? 'Not Selected' : 'Pending Committee'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Needs Correction Alert */}
      {application.status === 'needs_correction' && (
        <div className="bg-amber-50 border border-amber-300 p-4 mb-6 text-xs text-amber-900">
          <div className="font-bold text-sm mb-1">
            ⚠️ Scrutiny Committee Notice: Corrections Requested
          </div>
          <p className="mb-3">
            The scholarship reviewer has flagged an item on your application that requires your attention. Please update the necessary fields and re-submit your form.
          </p>
          <Link
            href={`/apply/${appData.scholarship_code || 'MNC'}`}
            className="gov-btn gov-btn-primary text-xs py-1.5 px-3"
          >
            Open Form to Edit & Resubmit →
          </Link>
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
                  href={file.url}
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
