'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import EligibilityPanel from '@/components/EligibilityPanel';

export default function AdminApplicationDetailPage({
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
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form states for decisions and notes
  const [decisionRemark, setDecisionRemark] = useState('');
  const [decisionAction, setDecisionAction] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [internalNote, setInternalNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((sess) => {
        if (!sess.authenticated || (sess.user.role !== 'admin' && sess.user.role !== 'reviewer')) {
          router.push('/login');
          return;
        }
        setSession(sess.user);

        fetch(`/api/applications/${id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.error) {
              router.push('/admin/applications');
              return;
            }
            setApplication(data.application);
            setScholarship(data.scholarship);
            setFiles(data.files || []);
            setRemarks(data.remarks || []);
            setLoading(false);
          });
      });
  }, [id, router]);

  const handleDecision = async (action: string) => {
    if (action === 'reject' && !decisionRemark.trim()) {
      alert('A rejection reason is mandatory.');
      return;
    }
    if (action === 'correction' && !decisionRemark.trim()) {
      alert('Please enter specific correction instructions for the student.');
      return;
    }

    if (!confirm(`Are you sure you want to mark this application as '${action.toUpperCase()}'?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/applications/${id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          remark: decisionRemark,
        }),
      });

      const data = await res.json();
      setIsProcessing(false);

      if (res.ok) {
        setApplication(data.application);
        setDecisionAction(null);
        setDecisionRemark('');
        setMessage(`Action '${action.toUpperCase()}' completed successfully and notification dispatched.`);
        // Reload remarks
        fetch(`/api/applications/${id}`)
          .then((r) => r.json())
          .then((d) => setRemarks(d.remarks || []));
      } else {
        alert(data.error?.message || 'Failed to update decision');
      }
    } catch {
      setIsProcessing(false);
      alert('Error updating application decision');
    }
  };

  const handleToggleHardCopy = async (received: boolean) => {
    try {
      const res = await fetch(`/api/admin/applications/${id}/hard-copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hard_copy_received: received }),
      });
      if (res.ok) {
        const data = await res.json();
        setApplication(data.application);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecommendation = async (recStatus: 'recommended' | 'not_recommended') => {
    const note = prompt(`Enter ${recStatus.toUpperCase()} recommendation remark for candidate:`) || '';
    try {
      const res = await fetch(`/api/admin/applications/${id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recommendation',
          recommendation_status: recStatus,
          recommendation_note: note,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setApplication(data.application);
        fetch(`/api/applications/${id}`).then((r) => r.json()).then((d) => setRemarks(d.remarks || []));
      } else {
        const err = await res.json();
        alert(`Error: ${err.error?.message || 'Failed'}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalNote.trim()) return;

    try {
      const res = await fetch(`/api/admin/applications/${id}/remarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: internalNote,
          kind: 'internal_note',
        }),
      });
      if (res.ok) {
        setInternalNote('');
        fetch(`/api/applications/${id}`)
          .then((r) => r.json())
          .then((d) => setRemarks(d.remarks || []));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-xs text-gray-600">
        Loading application details for scrutiny...
      </div>
    );
  }

  const appData = application?.data || {};

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs text-gray-500 flex items-center gap-1.5">
        <Link href="/admin/applications" className="hover:text-[#AC3D47]">Applications</Link>
        <span>/</span>
        <span className="text-[#AC3D47] font-semibold">{application.ref_no}</span>
      </nav>

      {/* Header Bar */}
      <div className="border border-gray-300 bg-white p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-[#AC3D47] bg-[#EEF1F6] px-2.5 py-0.5 border border-gray-300">
              {application.ref_no}
            </span>
            <span className="text-xs px-2 py-0.5 font-bold uppercase bg-gray-100 text-gray-800 border border-gray-300">
              STATUS: {application.status.toUpperCase()}
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#AC3D47]">
            {appData.full_name} ({appData.usn})
          </h1>
          <div className="text-xs text-gray-600">
            {scholarship?.name} | Submitted: {application.submitted_at ? new Date(application.submitted_at).toLocaleString('en-IN') : 'Draft'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/applications/${application.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="gov-btn gov-btn-outline text-xs"
          >
            📥 Official PDF
          </a>
          <label className="flex items-center gap-1.5 text-xs font-semibold bg-gray-50 border border-gray-300 px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={application.hard_copy_received || false}
              onChange={(e) => handleToggleHardCopy(e.target.checked)}
              className="h-4 w-4 text-[#AC3D47]"
            />
            <span>Hard Copy Received</span>
          </label>
        </div>
      </div>

      {message && (
        <div className="mb-4 bg-emerald-50 border border-emerald-300 p-3 text-xs text-emerald-800 font-bold">
          {message}
        </div>
      )}

      {/* Live Eligibility and Merit Score Summary */}
      <EligibilityPanel computed={application.computed} scholarshipCode={scholarship?.code} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column: Form Details & Files (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detailed answers */}
          <div className="gov-card p-5">
            <h2 className="font-bold text-[#AC3D47] text-sm uppercase tracking-wider mb-3 border-b border-gray-200 pb-2">
              Application Information (Official Form Layout)
            </h2>

            <div className="text-xs divide-y divide-gray-200">
              <div className="py-2.5 grid grid-cols-2 gap-2">
                <div><span className="text-gray-500 font-medium">1. Name in Full:</span> <span className="font-bold">{appData.full_name}</span></div>
                <div><span className="text-gray-500 font-medium">2. Date of Birth:</span> <span>{appData.dob}</span></div>
                <div><span className="text-gray-500 font-medium">3. Nationality:</span> <span>{appData.nationality}</span></div>
                <div><span className="text-gray-500 font-medium">4. Father/Guardian:</span> <span>{appData.father_or_guardian_name}</span></div>
                <div className="col-span-2"><span className="text-gray-500 font-medium">5. Address:</span> <span>{appData.address} {appData.pincode ? `(${appData.pincode})` : ''} • Mobile: {appData.mobile} • Email: {appData.email}</span></div>
              </div>

              <div className="py-2.5 grid grid-cols-2 gap-2">
                <div><span className="text-gray-500 font-medium">6. a) Parent Occupation:</span> <span>{appData.parent_occupation}</span></div>
                <div>
                  <span className="text-gray-500 font-medium">6. b) Family Annual Income:</span>{' '}
                  <span className="font-bold text-[#AC3D47]">Rs. {(appData.family_annual_income || 0).toLocaleString('en-IN')}/yr</span>
                  <span className="text-[10px] text-gray-500 block">Cert Date: {appData.income_cert_issue_date}</span>
                </div>
              </div>

              <div className="py-2.5 grid grid-cols-2 gap-2">
                <div><span className="text-gray-500 font-medium">7. a) Last Exam Passed:</span> <span>{appData.last_exam_passed} (CET Quota: {appData.admitted_through_cet ? 'Yes' : 'No'})</span></div>
                <div><span className="text-gray-500 font-medium">7. b) Marks Obtained/Total:</span> <span className="font-mono">{appData.marks_obtained} / {appData.marks_gross_total}</span></div>
                <div><span className="text-gray-500 font-medium">7. c) Percentage:</span> <span className="font-bold text-[#AC3D47]">{appData.percentage}%</span></div>
                {appData.cgpa && <div><span className="text-gray-500 font-medium">CGPA (Years 2–4):</span> <span className="font-bold font-mono">{appData.cgpa} / 10.0</span></div>}
                <div><span className="text-gray-500 font-medium">Calculated Merit Score:</span> <span className="font-mono font-bold text-base text-[#AC3D47]">{application.merit_score}</span></div>
                {appData.year_of_study > 1 && (
                  <div><span className="text-gray-500 font-medium">Backlog History:</span> <span className={appData.has_backlog_history ? 'text-red-700 font-bold' : 'text-emerald-700 font-bold'}>{appData.has_backlog_history ? 'Has Backlog (Disqualified)' : 'Zero Backlogs (Eligible)'}</span></div>
                )}
              </div>

              <div className="py-2.5 grid grid-cols-2 gap-2">
                <div><span className="text-gray-500 font-medium">8. Present Course & Sem:</span> <span>{appData.course} (Year {appData.year_of_study}, Sem {appData.semester})</span></div>
                <div><span className="text-gray-500 font-medium">Course Duration & Final:</span> <span>{appData.course_duration_years} Years (Exam: {appData.final_exam_month_year})</span></div>
                <div><span className="text-gray-500 font-medium">9. {scholarship?.fee_label}:</span> <span className="font-bold">Rs. {(appData.annual_fee || 0).toLocaleString('en-IN')}</span></div>
                <div><span className="text-gray-500 font-medium">10. Applied Previously:</span> <span>{appData.applied_earlier ? `Yes (Ref: ${appData.previous_application_ref_no})` : 'No'}</span></div>
                <div><span className="text-gray-500 font-medium">11. Other Stipend:</span> <span>{appData.getting_other_scholarship ? `Yes (Rs. ${appData.other_scholarship_amount_per_month}/mo)` : 'No'}</span></div>
                <div><span className="text-gray-500 font-medium">12. Amount Requested:</span> <span className="font-bold text-[#AC3D47]">Rs. {(appData.scholarship_amount_required_per_month || 0).toLocaleString('en-IN')}/mo</span></div>
              </div>

              <div className="py-2.5 grid grid-cols-2 gap-2">
                <div><span className="text-gray-500 font-medium">13. SB Account Number:</span> <span className="font-mono font-bold">{appData.bank_acc_no}</span></div>
                <div><span className="text-gray-500 font-medium">Account Holder:</span> <span>{appData.bank_acc_holder_name}</span></div>
                <div><span className="text-gray-500 font-medium">Bank & Branch:</span> <span>{appData.bank_name}, {appData.bank_branch}</span></div>
                <div><span className="text-gray-500 font-medium">IFSC Code:</span> <span className="font-mono uppercase font-bold">{appData.bank_ifsc}</span></div>
              </div>
            </div>
          </div>

          {/* Uploaded Enclosures */}
          <div className="gov-card p-5">
            <h2 className="font-bold text-[#AC3D47] text-sm uppercase tracking-wider mb-3 border-b border-gray-200 pb-2">
              Uploaded Enclosures & Digital Signatures ({files.length} Files)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {files.map((file) => (
                <div key={file.id} className="border border-gray-200 p-3 bg-gray-50 flex items-center justify-between">
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
                    Open Document
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Embedded PDF */}
          <div className="gov-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#AC3D47] uppercase">Tamper-Evident Generated PDF</span>
              <span className="text-[10px] font-mono text-gray-500">SHA-256: {application.pdf_sha256}</span>
            </div>
            <iframe
              src={`/api/applications/${application.id}/pdf`}
              className="w-full h-[520px] border border-gray-300"
              title="Official Application Form"
            />
          </div>
        </div>

        {/* Right Column: Scrutiny Actions & Remarks (1 col) */}
        <div className="space-y-6">
          {/* Decision Box */}
          <div className="gov-card p-5 border-l-4 border-l-[#AC3D47]">
            <h2 className="font-bold text-[#AC3D47] text-sm uppercase tracking-wider mb-3 border-b border-gray-200 pb-2">
              Committee Decision & Actions
            </h2>

            <div className="space-y-3 text-xs">
              {/* Faculty / HoD Recommendation */}
              {scholarship?.requires_recommendation && (
                <div className="border border-gray-300 p-3 bg-gray-50 mb-3">
                  <div className="font-bold text-gray-700 mb-2">Faculty / HoD Recommendation</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleDecision('recommendation')}
                      className="gov-btn gov-btn-primary text-xs flex-1 py-1.5"
                    >
                      ✓ Recommend
                    </button>
                  </div>
                </div>
              )}

              {/* Admin Actions */}
              {session?.role === 'admin' ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleDecision('accept')}
                      className="gov-btn bg-emerald-700 text-white hover:bg-emerald-800 text-xs py-2 font-bold"
                    >
                      ✓ Accept / Sanction
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleDecision('shortlist')}
                      className="gov-btn bg-blue-700 text-white hover:bg-blue-800 text-xs py-2 font-bold"
                    >
                      ★ Shortlist for Award
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleDecision('correction')}
                      className="gov-btn bg-amber-600 text-white hover:bg-amber-700 text-xs py-2 font-bold"
                    >
                      ✎ Request Correction
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleDecision('reject')}
                      className="gov-btn gov-btn-danger text-xs py-2 font-bold"
                    >
                      ✕ Reject
                    </button>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Decision Remark / Correction Notice:
                    </label>
                    <textarea
                      rows={3}
                      value={decisionRemark}
                      onChange={(e) => setDecisionRemark(e.target.value)}
                      placeholder="Mandatory if rejecting or requesting corrections. Sent directly to student."
                      className="gov-input"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3 pt-2 text-xs">
                  <div className="font-bold text-gray-700">Department / Proctor Recommendation:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRecommendation('recommended')}
                      className="gov-btn bg-emerald-700 text-white hover:bg-emerald-800 text-xs py-2 font-bold"
                    >
                      ✓ Recommend
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRecommendation('not_recommended')}
                      className="gov-btn bg-red-700 text-white hover:bg-red-800 text-xs py-2 font-bold"
                    >
                      ✗ Do Not Recommend
                    </button>
                  </div>
                  <div className="text-[11px] text-gray-600 bg-gray-50 p-2 border border-gray-200">
                    Current Recommendation: <strong className="uppercase text-[#AC3D47]">{application.recommendation_status || 'Pending'}</strong>
                    {application.recommendation_note && (
                      <div className="mt-1 text-gray-500">Note: {application.recommendation_note}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Remarks Thread */}
          <div className="gov-card p-5">
            <h2 className="font-bold text-[#AC3D47] text-sm uppercase tracking-wider mb-3 border-b border-gray-200 pb-2">
              Scrutiny Remarks & Audit Notes
            </h2>

            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto text-xs divide-y divide-gray-100">
              {remarks.length === 0 ? (
                <p className="text-gray-500 py-2">No remarks logged yet.</p>
              ) : (
                remarks.map((r) => (
                  <div key={r.id} className="pt-2">
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span className="font-bold text-[#AC3D47]">{r.author_name}</span>
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-gray-800 mt-0.5 bg-gray-50 p-2 border border-gray-200">
                      {r.body}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddInternalNote} className="space-y-2 text-xs">
              <label className="block font-bold text-gray-700">Add Staff Scrutiny Note</label>
              <textarea
                rows={2}
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Internal verification notes..."
                className="gov-input"
              />
              <button type="submit" className="gov-btn gov-btn-secondary text-xs w-full py-1.5">
                Save Internal Note
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
