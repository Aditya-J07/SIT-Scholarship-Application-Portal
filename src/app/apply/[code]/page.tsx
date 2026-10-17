'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import WizardNav from '@/components/WizardNav';
import EligibilityPanel from '@/components/EligibilityPanel';
import SignaturePad from '@/components/SignaturePad';
import FileUploadField from '@/components/FileUploadField';
import { useLanguage } from '@/components/LanguageToggle';
import { SIT_COURSES, ENCLOSURES_METADATA, REQUIRE_GUARDIAN_CONSENT_FOR_MINORS } from '@/lib/constants';
import { isApplicantMinor } from '@/lib/schemas/application';

export default function ApplyWizardPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const router = useRouter();
  const { code } = use(params);
  const { t, lang } = useLanguage();

  const [step, setStep] = useState(1);
  const [application, setApplication] = useState<any>(null);
  const [scholarship, setScholarship] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // 1. Load or Initialize Application Draft
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((sess) => {
        if (!sess.authenticated) {
          router.push(`/login?redirect=/apply/${code}`);
          return;
        }

        // Initialize draft for this scholarship
        fetch('/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scholarship_code: code }),
        })
          .then((res) => res.json())
          .then((appRes) => {
            if (!appRes.success) {
              setErrorMessage(appRes.error?.message || 'Could not initiate application');
              setLoading(false);
              return;
            }

            // Fetch complete application data
            fetch(`/api/applications/${appRes.application.id}`)
              .then((r) => r.json())
              .then((data) => {
                setApplication(data.application);
                setScholarship(data.scholarship);
                setFiles(data.files || []);
                setFormData(data.application.data || {});
                if (data.application.current_step && data.application.current_step >= 1 && data.application.current_step <= 7) {
                  setStep(data.application.current_step);
                }
                setLoading(false);
              });
          })
          .catch(() => {
            setErrorMessage('Network connection error');
            setLoading(false);
          });
      });
  }, [code, router]);

  // Handle IFSC Lookup
  const handleIfscLookup = async (ifscCode: string) => {
    const clean = ifscCode.trim().toUpperCase();
    if (/^[A-Z]{4}0[A-Z0-9]{6}$/.test(clean)) {
      try {
        const res = await fetch(`/api/ifsc/${clean}`);
        if (res.ok) {
          const resData = await res.json();
          if (resData.data) {
            setFormData((prev: any) => ({
              ...prev,
              bank_name: resData.data.bank || prev.bank_name,
              bank_branch: resData.data.branch ? `${resData.data.branch}, ${resData.data.city}` : prev.bank_branch,
            }));
          }
        }
      } catch (err) {
        console.warn('IFSC auto-lookup error:', err);
      }
    }
  };

  // Auto-compute percentage when marks change
  const handleMarksChange = (obtained: number, total: number) => {
    let pct = 0;
    if (total > 0 && obtained >= 0) {
      pct = Number(((obtained / total) * 100).toFixed(2));
    }
    setFormData((prev: any) => ({
      ...prev,
      marks_obtained: obtained,
      marks_gross_total: total,
      percentage: pct,
    }));
  };

  // Save current step data to server
  const saveStepData = async (targetStep = step): Promise<boolean> => {
    if (!application) return false;
    setSaving(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      const res = await fetch(`/api/applications/${application.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: targetStep,
          stepData: formData,
          last_updated_at: application.updated_at || new Date().toISOString(),
        }),
      });

      const resData = await res.json();
      setSaving(false);

      if (!res.ok) {
        setErrorMessage(resData.error?.message || 'Please correct errors in this section');
        if (resData.error?.fields) {
          setFieldErrors(resData.error.fields);
        }
        return false;
      }

      setApplication(resData.application);
      return true;
    } catch {
      setSaving(false);
      setErrorMessage('Failed to auto-save draft');
      return false;
    }
  };

  const handleNext = async () => {
    const success = await saveStepData(step);
    if (success && step < 7) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      saveStepData(step);
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const refreshFiles = async () => {
    if (!application) return;
    try {
      const res = await fetch(`/api/applications/${application.id}/files`);
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
      }
    } catch (err) {
      console.warn('Error refreshing files:', err);
    }
  };

  // Final Submit Application
  const handleSubmitFinal = async () => {
    if (!application) return;
    setSubmitting(true);
    setErrorMessage(null);

    // Save step 7 data first
    const saved = await saveStepData(7);
    if (!saved) {
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/applications/${application.id}/submit`, {
        method: 'POST',
      });

      const resData = await res.json();
      setSubmitting(false);

      if (!res.ok) {
        setErrorMessage(resData.error?.message || 'Submission failed');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        router.push(`/applications/${application.id}?submitted=true`);
      }
    } catch {
      setSubmitting(false);
      setErrorMessage('Network error during submission. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-xs text-gray-600">
        Loading scholarship application wizard...
      </div>
    );
  }

  if (errorMessage && !application) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="gov-card p-6 border-gray-300 text-center">
          <h1 className="text-base font-bold text-red-700 mb-2">Unable to Proceed</h1>
          <p className="text-xs text-gray-600 mb-4">{errorMessage}</p>
          <Link href="/dashboard" className="gov-btn gov-btn-primary text-xs">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const feeLabel = scholarship?.fee_label || 'Total fee per year';

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      {/* Reference & Scholarship Header */}
      <div className="border border-gray-300 bg-white p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="font-mono text-xs font-bold text-[#AC3D47] bg-[#EEF1F6] px-2 py-0.5 border border-gray-300">
            {t.wizard_header_ref} {application?.ref_no}
          </span>
          <h1 className="text-base font-bold text-[#AC3D47] mt-1">
            {scholarship?.name}
          </h1>
          <div className="text-xs text-gray-500">
            {t.college_full} | {t.academic_year} 2026–2027
          </div>
        </div>

        <div className="flex gap-2">
          <a
            href={`/api/applications/${application?.id}/pdf?draft=true`}
            target="_blank"
            rel="noopener noreferrer"
            className="gov-btn gov-btn-outline text-xs py-1 px-3 min-h-[34px]"
          >
            {lang === 'kn' ? 'ಕರಡು ಪಿಡಿಎಫ್ ಮುನ್ನೋಟ' : 'Preview Draft PDF'}
          </a>
        </div>
      </div>

      {/* Step Wizard Nav & Auto-save Status */}
      <WizardNav
        currentStep={step}
        totalSteps={7}
        onStepClick={(s) => {
          saveStepData(step);
          setStep(s);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isSaving={saving}
      />

      {/* Live Eligibility Status Panel */}
      <EligibilityPanel computed={application?.computed} scholarshipCode={scholarship?.code} />

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-4 bg-red-50 border border-red-300 p-3 text-xs text-red-700 font-semibold" role="alert">
          {errorMessage}
        </div>
      )}

      {/* Form Steps Container */}
      <div className="gov-card p-6 border-gray-300 bg-white">
        {/* ================= STEP 1: SCHOLARSHIP & STUDENT DETAILS ================= */}
        {step === 1 && (
          <div className="space-y-4 text-xs">
            <div className="gov-header-bar text-xs">Step 1: Scholarship & Student Identity</div>

            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="f-name">
                Full Name (CAPITAL LETTERS) <span className="text-red-600">*</span>
                <span className="font-normal text-gray-500 ml-1">(as per SSLC/SSC mark sheet)</span>
              </label>
              <input
                id="f-name"
                type="text"
                required
                value={formData.full_name || ''}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value.toUpperCase() })}
                placeholder="AS PER SSLC / MATRICULATION MARKS SHEET"
                className="gov-input uppercase"
              />
              {fieldErrors.full_name && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.full_name[0]}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="f-usn">
                  University Seat Number (USN) <span className="text-red-600">*</span>
                </label>
                <input
                  id="f-usn"
                  type="text"
                  required
                  value={formData.usn || ''}
                  onChange={(e) => setFormData({ ...formData, usn: e.target.value.toUpperCase() })}
                  placeholder="e.g. 1SI23CS089"
                  className="gov-input uppercase font-mono"
                />
                {fieldErrors.usn && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.usn[0]}</p>}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="f-dob">
                  Date of Birth <span className="text-red-600">*</span>
                  <span className="font-normal text-gray-500 ml-1">(Age 16–35)</span>
                </label>
                <input
                  id="f-dob"
                  type="date"
                  required
                  value={formData.dob || ''}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="gov-input font-mono"
                />
                {fieldErrors.dob && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.dob[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="f-father">
                  Father&apos;s / Guardian&apos;s Name <span className="text-red-600">*</span>
                </label>
                <input
                  id="f-father"
                  type="text"
                  required
                  value={formData.father_or_guardian_name || ''}
                  onChange={(e) => setFormData({ ...formData, father_or_guardian_name: e.target.value.toUpperCase() })}
                  placeholder="FATHER OR LEGAL GUARDIAN"
                  className="gov-input uppercase"
                />
                {fieldErrors.father_or_guardian_name && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.father_or_guardian_name[0]}</p>}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="f-nation">
                  Nationality <span className="text-red-600">*</span>
                </label>
                <input
                  id="f-nation"
                  type="text"
                  required
                  value={formData.nationality || 'Indian'}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  className="gov-input"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="f-addr">
                Address for Communication <span className="text-red-600">*</span>
              </label>
              <textarea
                id="f-addr"
                rows={2}
                required
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Door/House No., Street, Area, City, District, State"
                className="gov-input"
              />
              {fieldErrors.address && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.address[0]}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="f-pin">
                  PIN Code
                </label>
                <input
                  id="f-pin"
                  type="text"
                  maxLength={6}
                  value={formData.pincode || ''}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') })}
                  placeholder="572103"
                  className="gov-input font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="f-mob">
                  Mobile Number <span className="text-red-600">*</span>
                </label>
                <input
                  id="f-mob"
                  type="tel"
                  maxLength={10}
                  required
                  value={formData.mobile || ''}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '') })}
                  placeholder="9880123456"
                  className="gov-input font-mono"
                />
                {fieldErrors.mobile && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.mobile[0]}</p>}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="f-mail">
                  Email ID <span className="text-red-600">*</span>
                </label>
                <input
                  id="f-mail"
                  type="email"
                  required
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                  placeholder="rohan@sit.ac.in"
                  className="gov-input"
                />
                {fieldErrors.email && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.email[0]}</p>}
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: FAMILY BACKGROUND ================= */}
        {step === 2 && (
          <div className="space-y-4 text-xs">
            <div className="gov-header-bar text-xs">Step 2: Family Background & Income Verification</div>

            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="f-parent-occ">
                a) Occupation of Parent / Guardian <span className="text-red-600">*</span>
              </label>
              <input
                id="f-parent-occ"
                type="text"
                required
                value={formData.parent_occupation || ''}
                onChange={(e) => setFormData({ ...formData, parent_occupation: e.target.value })}
                placeholder="e.g. Farmer, Daily Wage Earner, Private Employee"
                className="gov-input"
              />
              {fieldErrors.parent_occupation && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.parent_occupation[0]}</p>}
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="f-income">
                b) Annual Income of Entire Family from All Sources (Rs.) <span className="text-red-600">*</span>
                <span className="font-normal text-gray-500 ml-1">
                  (MNC Limit: Max Rs. 3,00,000 / year)
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500 font-bold">₹</span>
                <input
                  id="f-income"
                  type="number"
                  required
                  min={0}
                  max={9999999}
                  value={formData.family_annual_income ?? ''}
                  onChange={(e) => setFormData({ ...formData, family_annual_income: Number(e.target.value) })}
                  placeholder="e.g. 150000"
                  className="gov-input pl-7 font-mono text-sm"
                />
              </div>
              {formData.family_annual_income > 0 && (
                <div className="text-[11px] text-gray-600 mt-1">
                  Indian Currency Format: <span className="font-bold text-[#AC3D47]">Rs. {formData.family_annual_income.toLocaleString('en-IN')}</span> per year
                </div>
              )}
              {fieldErrors.family_annual_income && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.family_annual_income[0]}</p>}
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="f-income-date">
                Income Certificate Issue Date <span className="text-red-600">*</span>
                <span className="font-normal text-gray-500 ml-1">
                  (Must not be older than 5 years as on date of application)
                </span>
              </label>
              <input
                id="f-income-date"
                type="date"
                required
                value={formData.income_cert_issue_date || ''}
                onChange={(e) => setFormData({ ...formData, income_cert_issue_date: e.target.value })}
                className="gov-input font-mono max-w-xs"
              />
              {fieldErrors.income_cert_issue_date && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.income_cert_issue_date[0]}</p>}
            </div>
          </div>
        )}

        {/* ================= STEP 3: ACADEMICS ================= */}
        {step === 3 && (
          <div className="space-y-4 text-xs">
            <div className="gov-header-bar text-xs">Step 3: Academic Qualifications & Merit Scoring</div>

            {/* CET Admission */}
            <div className="border border-gray-300 p-3 bg-gray-50">
              <label className="block font-bold text-gray-800 mb-2">
                Were you admitted to SIT through CET (Common Entrance Test)? <span className="text-red-600">*</span>
                <span className="font-normal text-gray-600 block text-[11px]">
                  (Note: Dr. M.N. Channabasappa Endowment Fund is restricted to CET quota students only)
                </span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="cet_quota"
                    checked={formData.admitted_through_cet === true}
                    onChange={() => setFormData({ ...formData, admitted_through_cet: true })}
                    className="h-4 w-4 text-[#AC3D47]"
                  />
                  <span className="font-semibold text-gray-800">Yes (Admitted through CET)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="cet_quota"
                    checked={formData.admitted_through_cet === false}
                    onChange={() => setFormData({ ...formData, admitted_through_cet: false })}
                    className="h-4 w-4 text-[#AC3D47]"
                  />
                  <span className="font-semibold text-gray-800">No (Management / ComedK Quota)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="f-lastexam">
                a) Particulars of Last Examination Passed <span className="text-red-600">*</span>
                <span className="font-normal text-gray-500 ml-1">
                  (For 1st Year: II PUC / 12th Std; For 2nd–4th Year: Previous Semester B.E.)
                </span>
              </label>
              <input
                id="f-lastexam"
                type="text"
                required
                value={formData.last_exam_passed || ''}
                onChange={(e) => setFormData({ ...formData, last_exam_passed: e.target.value })}
                placeholder="e.g. II PUC, 1st Year B.E. (Sem 2)"
                className="gov-input"
              />
              {fieldErrors.last_exam_passed && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.last_exam_passed[0]}</p>}
            </div>

            {/* Marks & Percentage */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="f-marks-obt">
                  b) Marks Obtained <span className="text-red-600">*</span>
                </label>
                <input
                  id="f-marks-obt"
                  type="number"
                  required
                  min={0}
                  value={formData.marks_obtained ?? ''}
                  onChange={(e) => handleMarksChange(Number(e.target.value), formData.marks_gross_total || 0)}
                  className="gov-input font-mono"
                />
                {fieldErrors.marks_obtained && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.marks_obtained[0]}</p>}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="f-marks-tot">
                  Gross Total Marks <span className="text-red-600">*</span>
                </label>
                <input
                  id="f-marks-tot"
                  type="number"
                  required
                  min={1}
                  value={formData.marks_gross_total ?? ''}
                  onChange={(e) => handleMarksChange(formData.marks_obtained || 0, Number(e.target.value))}
                  className="gov-input font-mono"
                />
                {fieldErrors.marks_gross_total && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.marks_gross_total[0]}</p>}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="f-marks-pct">
                  c) Percentage of Marks (%)
                  <span className="font-normal text-gray-500 ml-1">(Computed)</span>
                </label>
                <input
                  id="f-marks-pct"
                  type="text"
                  readOnly
                  disabled
                  value={formData.percentage ? `${formData.percentage}%` : '0.00%'}
                  className="gov-input bg-gray-100 font-mono font-bold text-[#AC3D47]"
                />
              </div>
            </div>

            {/* Course, Year, Semester */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="f-course">
                  Course / Department <span className="text-red-600">*</span>
                </label>
                <select
                  id="f-course"
                  required
                  value={formData.course || ''}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                  className="gov-input"
                >
                  <option value="">-- Select Course --</option>
                  {SIT_COURSES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {fieldErrors.course && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.course[0]}</p>}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="f-year">
                  Year of Study <span className="text-red-600">*</span>
                </label>
                <select
                  id="f-year"
                  required
                  value={formData.year_of_study || 1}
                  onChange={(e) => {
                    const yr = Number(e.target.value);
                    const defaultSem = (yr - 1) * 2 + 1;
                    setFormData({ ...formData, year_of_study: yr, semester: defaultSem });
                  }}
                  className="gov-input font-semibold"
                >
                  <option value={1}>1st Year B.E.</option>
                  <option value={2}>2nd Year B.E.</option>
                  <option value={3}>3rd Year B.E.</option>
                  <option value={4}>4th Year B.E.</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="f-sem">
                  Current Semester <span className="text-red-600">*</span>
                </label>
                <select
                  id="f-sem"
                  required
                  value={formData.semester || 1}
                  onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })}
                  className="gov-input font-semibold"
                >
                  {formData.year_of_study === 1 && (
                    <>
                      <option value={1}>Semester 1</option>
                      <option value={2}>Semester 2</option>
                    </>
                  )}
                  {formData.year_of_study === 2 && (
                    <>
                      <option value={3}>Semester 3</option>
                      <option value={4}>Semester 4</option>
                    </>
                  )}
                  {formData.year_of_study === 3 && (
                    <>
                      <option value={5}>Semester 5</option>
                      <option value={6}>Semester 6</option>
                    </>
                  )}
                  {formData.year_of_study === 4 && (
                    <>
                      <option value={7}>Semester 7</option>
                      <option value={8}>Semester 8</option>
                    </>
                  )}
                </select>
                {fieldErrors.semester && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.semester[0]}</p>}
              </div>
            </div>

            {/* CGPA and Backlog (for Year 2 to 4) */}
            {formData.year_of_study > 1 && (
              <div className="border border-[#AC3D47]/30 bg-[#FDF5F6] p-4 space-y-3">
                <div className="font-bold text-[#AC3D47]">
                  Performance Metrics for Senior Students (Years 2 to 4)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1" htmlFor="f-cgpa">
                      Cumulative Grade Point Average (CGPA) <span className="text-red-600">*</span>
                      <span className="font-normal text-gray-500 ml-1">(Scale: 0.00 to 10.00)</span>
                    </label>
                    <input
                      id="f-cgpa"
                      type="number"
                      step="0.01"
                      min={0}
                      max={10}
                      required
                      value={formData.cgpa ?? ''}
                      onChange={(e) => setFormData({ ...formData, cgpa: Number(e.target.value) })}
                      placeholder="e.g. 8.75"
                      className="gov-input font-mono font-bold"
                    />
                    {fieldErrors.cgpa && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.cgpa[0]}</p>}
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Any Active or Past Backlog History? <span className="text-red-600">*</span>
                      <span className="font-normal text-gray-500 ml-1">(MNC Rule: Strictly No)</span>
                    </label>
                    <div className="flex gap-4 pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="backlog"
                          checked={formData.has_backlog_history === false}
                          onChange={() => setFormData({ ...formData, has_backlog_history: false })}
                          className="h-4 w-4 text-[#AC3D47]"
                        />
                        <span className="font-semibold text-gray-800">No (All Subjects Cleared)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="backlog"
                          checked={formData.has_backlog_history === true}
                          onChange={() => setFormData({ ...formData, has_backlog_history: true })}
                          className="h-4 w-4 text-[#AC3D47]"
                        />
                        <span className="font-semibold text-red-700">Yes (Has Backlog)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="f-dur">
                  b) Duration of Course (Years)
                </label>
                <input
                  id="f-dur"
                  type="number"
                  readOnly
                  disabled
                  value={formData.course_duration_years || 4}
                  className="gov-input bg-gray-100 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="f-final-exam">
                  c) Month & Year of Final Exam at end of Course <span className="text-red-600">*</span>
                </label>
                <input
                  id="f-final-exam"
                  type="month"
                  required
                  value={formData.final_exam_month_year || ''}
                  onChange={(e) => setFormData({ ...formData, final_exam_month_year: e.target.value })}
                  className="gov-input font-mono"
                />
                {fieldErrors.final_exam_month_year && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.final_exam_month_year[0]}</p>}
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 4: FEES AND OTHER ASSISTANCE ================= */}
        {step === 4 && (
          <div className="space-y-4 text-xs">
            <div className="gov-header-bar text-xs">Step 4: Fees and Other Financial Assistance</div>

            {/* Fee */}
            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="f-fee">
                {feeLabel} (Rs.) <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500 font-bold">₹</span>
                <input
                  id="f-fee"
                  type="number"
                  required
                  min={1}
                  value={formData.annual_fee ?? ''}
                  onChange={(e) => setFormData({ ...formData, annual_fee: Number(e.target.value) })}
                  placeholder="e.g. 98000"
                  className="gov-input pl-7 font-mono text-sm"
                />
              </div>
              {formData.annual_fee > 0 && (
                <div className="text-[11px] text-gray-600 mt-1">
                  Formatted: <span className="font-bold text-[#AC3D47]">Rs. {formData.annual_fee.toLocaleString('en-IN')}</span> per year
                </div>
              )}
              {fieldErrors.annual_fee && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.annual_fee[0]}</p>}
            </div>

            {/* Applied Earlier */}
            <div className="border border-gray-300 p-3 bg-gray-50">
              <label className="block font-bold text-gray-800 mb-2">
                Have you applied previously to us for this scholarship? <span className="text-red-600">*</span>
              </label>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="applied_earlier"
                    checked={formData.applied_earlier === true}
                    onChange={() => setFormData({ ...formData, applied_earlier: true })}
                    className="h-4 w-4 text-[#AC3D47]"
                  />
                  <span className="font-semibold text-gray-800">Yes</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="applied_earlier"
                    checked={formData.applied_earlier === false}
                    onChange={() => setFormData({ ...formData, applied_earlier: false, previous_application_ref_no: '' })}
                    className="h-4 w-4 text-[#AC3D47]"
                  />
                  <span className="font-semibold text-gray-800">No</span>
                </label>
              </div>

              {formData.applied_earlier && (
                <div className="mt-2">
                  <label className="block font-bold text-gray-700 mb-1" htmlFor="f-prev-ref">
                    Previous Reference / File Number <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="f-prev-ref"
                    type="text"
                    required
                    value={formData.previous_application_ref_no || ''}
                    onChange={(e) => setFormData({ ...formData, previous_application_ref_no: e.target.value })}
                    placeholder="e.g. SIT-MNC-2025-000421"
                    className="gov-input font-mono uppercase max-w-sm"
                  />
                  {fieldErrors.previous_application_ref_no && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.previous_application_ref_no[0]}</p>}
                </div>
              )}
            </div>

            {/* Other stipend */}
            <div className="border border-gray-300 p-3 bg-gray-50">
              <label className="block font-bold text-gray-800 mb-2">
                Are you getting any stipend / scholarship from any other source? <span className="text-red-600">*</span>
                <span className="font-normal text-gray-600 block text-[11px]">
                  (Note: Must not exceed 30% of total college fee to be eligible for MNC)
                </span>
              </label>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="other_sch"
                    checked={formData.getting_other_scholarship === true}
                    onChange={() => setFormData({ ...formData, getting_other_scholarship: true })}
                    className="h-4 w-4 text-[#AC3D47]"
                  />
                  <span className="font-semibold text-gray-800">Yes</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="other_sch"
                    checked={formData.getting_other_scholarship === false}
                    onChange={() => setFormData({ ...formData, getting_other_scholarship: false, other_scholarship_amount_per_month: 0 })}
                    className="h-4 w-4 text-[#AC3D47]"
                  />
                  <span className="font-semibold text-gray-800">No</span>
                </label>
              </div>

              {formData.getting_other_scholarship && (
                <div className="mt-2">
                  <label className="block font-bold text-gray-700 mb-1" htmlFor="f-other-amt">
                    Amount Received per Month (Rs.) <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="f-other-amt"
                    type="number"
                    min={1}
                    required
                    value={formData.other_scholarship_amount_per_month ?? ''}
                    onChange={(e) => setFormData({ ...formData, other_scholarship_amount_per_month: Number(e.target.value) })}
                    placeholder="e.g. 1000"
                    className="gov-input font-mono max-w-sm"
                  />
                  {fieldErrors.other_scholarship_amount_per_month && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.other_scholarship_amount_per_month[0]}</p>}
                </div>
              )}
            </div>

            {/* Requested Scholarship Amount */}
            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="f-req-amt">
                Scholarship Amount Required (Rs. per month) <span className="text-red-600">*</span>
                <span className="font-normal text-gray-500 ml-1">
                  (Guideline: Subject to maximum 50% of annual fee)
                </span>
              </label>
              <div className="relative max-w-sm">
                <span className="absolute left-3 top-2.5 text-gray-500 font-bold">₹</span>
                <input
                  id="f-req-amt"
                  type="number"
                  required
                  min={100}
                  value={formData.scholarship_amount_required_per_month ?? ''}
                  onChange={(e) => setFormData({ ...formData, scholarship_amount_required_per_month: Number(e.target.value) })}
                  placeholder="e.g. 3500"
                  className="gov-input pl-7 font-mono font-bold text-sm"
                />
              </div>
              {formData.scholarship_amount_required_per_month > 0 && (
                <div className="text-[11px] text-gray-600 mt-1">
                  Total Annual Requested: <span className="font-bold text-[#AC3D47]">Rs. {(formData.scholarship_amount_required_per_month * 12).toLocaleString('en-IN')}</span> per year
                </div>
              )}
              {fieldErrors.scholarship_amount_required_per_month && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.scholarship_amount_required_per_month[0]}</p>}
            </div>
          </div>
        )}

        {/* ================= STEP 5: BANK ACCOUNT DETAILS ================= */}
        {step === 5 && (
          <div className="space-y-4 text-xs">
            <div className="gov-header-bar text-xs">Step 5: Savings Bank Account of the Student (Own Account)</div>
            <p className="text-gray-600 text-[11px]">
              Note: The account must be in the student’s own name. Joint accounts with third parties or parent-only accounts are not accepted for direct DBT loan disbursement.
            </p>

            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="f-bank-holder">
                Account Holder Name <span className="text-red-600">*</span>
                <span className="font-normal text-gray-500 ml-1">(as per Bank Passbook)</span>
              </label>
              <input
                id="f-bank-holder"
                type="text"
                required
                value={formData.bank_acc_holder_name || ''}
                onChange={(e) => setFormData({ ...formData, bank_acc_holder_name: e.target.value.toUpperCase() })}
                placeholder="AS PER BANK PASSBOOK"
                className="gov-input uppercase"
              />
              {fieldErrors.bank_acc_holder_name && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.bank_acc_holder_name[0]}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="f-bank-acc">
                  S.B. Account Number (9 to 18 Digits) <span className="text-red-600">*</span>
                </label>
                <input
                  id="f-bank-acc"
                  type="text"
                  required
                  maxLength={18}
                  value={formData.bank_acc_no || ''}
                  onChange={(e) => setFormData({ ...formData, bank_acc_no: e.target.value.replace(/\D/g, '') })}
                  placeholder="e.g. 987654321098"
                  className="gov-input font-mono"
                />
                {fieldErrors.bank_acc_no && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.bank_acc_no[0]}</p>}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="f-bank-acc-confirm">
                  Confirm S.B. Account Number <span className="text-red-600">*</span>
                </label>
                <input
                  id="f-bank-acc-confirm"
                  type="text"
                  required
                  maxLength={18}
                  value={formData.confirm_bank_acc_no || ''}
                  onChange={(e) => setFormData({ ...formData, confirm_bank_acc_no: e.target.value.replace(/\D/g, '') })}
                  placeholder="Re-enter account number"
                  className="gov-input font-mono"
                />
                {fieldErrors.confirm_bank_acc_no && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.confirm_bank_acc_no[0]}</p>}
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="f-bank-ifsc">
                Bank IFSC Code <span className="text-red-600">*</span>
                <span className="font-normal text-gray-500 ml-1">(11 Alphanumeric characters)</span>
              </label>
              <input
                id="f-bank-ifsc"
                type="text"
                maxLength={11}
                required
                value={formData.bank_ifsc || ''}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setFormData({ ...formData, bank_ifsc: val });
                  handleIfscLookup(val);
                }}
                placeholder="e.g. SBIN0040523"
                className="gov-input font-mono uppercase max-w-xs"
              />
              {fieldErrors.bank_ifsc && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.bank_ifsc[0]}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="f-bank-name">
                  Bank Name <span className="text-red-600">*</span>
                </label>
                <input
                  id="f-bank-name"
                  type="text"
                  required
                  value={formData.bank_name || ''}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="State Bank of India / Canara Bank..."
                  className="gov-input"
                />
                {fieldErrors.bank_name && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.bank_name[0]}</p>}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="f-bank-branch">
                  Branch Address <span className="text-red-600">*</span>
                </label>
                <input
                  id="f-bank-branch"
                  type="text"
                  required
                  value={formData.bank_branch || ''}
                  onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
                  placeholder="SIT Extension Counter, Tumakuru"
                  className="gov-input"
                />
                {fieldErrors.bank_branch && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.bank_branch[0]}</p>}
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 6: DOCUMENT UPLOADS ================= */}
        {step === 6 && (
          <div className="space-y-4 text-xs">
            <div className="gov-header-bar text-xs">Step 6: Photographs, Digital Signatures & Mandatory Enclosures</div>
            <p className="text-gray-600 text-[11px]">
              Uploaded files are securely archived with tamper-evident SHA-256 signatures. Ensure all documents are clear, legible, and attested.
            </p>

            {/* Passport Photo */}
            <div className="border border-gray-300 p-4 bg-gray-50">
              <FileUploadField
                label="Passport Size Photograph (3.5 x 4.5 ratio)"
                kind="photo"
                applicationId={application.id}
                accept="image/jpeg,image/png"
                maxSizeMb={1}
                description="Recent formal colour photograph (JPG or PNG, max 1 MB)"
                existingFile={files.find((f) => f.kind === 'photo')}
                onUploaded={refreshFiles}
              />
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SignaturePad
                label="Student Signature"
                kind="sig_student"
                applicationId={application.id}
                existingUrl={files.find((f) => f.kind === 'sig_student')?.url}
                onUploaded={refreshFiles}
              />
              <SignaturePad
                label="Parent / Guardian Signature"
                kind="sig_parent"
                applicationId={application.id}
                existingUrl={files.find((f) => f.kind === 'sig_parent')?.url}
                onUploaded={refreshFiles}
              />
            </div>

            {/* Enclosures (a) to (f) */}
            <div className="border-t border-gray-300 pt-4 mt-6">
              <div className="font-bold text-[#AC3D47] mb-3 uppercase tracking-wider text-xs">
                Mandatory Supporting Documents (a to f)
              </div>

              <div className="space-y-3">
                {ENCLOSURES_METADATA.map((enc) => {
                  const existing = files.find((f) => f.kind === enc.kind);
                  return (
                    <FileUploadField
                      key={enc.kind}
                      label={`(${enc.code}) ${enc.title}`}
                      kind={enc.kind}
                      applicationId={application.id}
                      description={enc.description}
                      required={enc.required}
                      existingFile={existing}
                      onUploaded={refreshFiles}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 7: REVIEW AND DECLARE ================= */}
        {step === 7 && (
          <div className="space-y-6 text-xs">
            <div className="gov-header-bar text-xs">Step 7: Final Review & Submission Declaration</div>

            <p className="text-gray-700 text-xs leading-relaxed">
              Please inspect all entered values and uploaded documents below before signing the declaration and final submission. You may click &quot;Edit&quot; next to any section to make corrections.
            </p>

            {/* Review Section 1 */}
            <div className="border border-gray-300 bg-white">
              <div className="bg-gray-100 px-3 py-2 flex items-center justify-between border-b border-gray-300 font-bold text-[#AC3D47]">
                <span>1. Student Identity & Contact</span>
                <button type="button" onClick={() => setStep(1)} className="text-xs font-semibold text-[#AC3D47] hover:underline">
                  Edit Block ✎
                </button>
              </div>
              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div><span className="text-gray-500">Name:</span> <span className="font-bold">{formData.full_name || 'N/A'}</span></div>
                <div><span className="text-gray-500">USN:</span> <span className="font-mono font-bold">{formData.usn || 'N/A'}</span></div>
                <div><span className="text-gray-500">DOB:</span> <span>{formData.dob || 'N/A'}</span></div>
                <div><span className="text-gray-500">Father&apos;s Name:</span> <span>{formData.father_or_guardian_name || 'N/A'}</span></div>
                <div><span className="text-gray-500">Mobile:</span> <span className="font-mono">{formData.mobile || 'N/A'}</span></div>
                <div><span className="text-gray-500">Email:</span> <span>{formData.email || 'N/A'}</span></div>
                <div className="col-span-2 sm:col-span-3"><span className="text-gray-500">Address:</span> <span>{formData.address} {formData.pincode ? `(${formData.pincode})` : ''}</span></div>
              </div>
            </div>

            {/* Review Section 2 */}
            <div className="border border-gray-300 bg-white">
              <div className="bg-gray-100 px-3 py-2 flex items-center justify-between border-b border-gray-300 font-bold text-[#AC3D47]">
                <span>2. Family Background & Income</span>
                <button type="button" onClick={() => setStep(2)} className="text-xs font-semibold text-[#AC3D47] hover:underline">
                  Edit Block ✎
                </button>
              </div>
              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div><span className="text-gray-500">Occupation:</span> <span>{formData.parent_occupation || 'N/A'}</span></div>
                <div><span className="text-gray-500">Annual Income:</span> <span className="font-bold text-[#AC3D47]">Rs. {(formData.family_annual_income || 0).toLocaleString('en-IN')}</span></div>
                <div><span className="text-gray-500">Cert Issue Date:</span> <span>{formData.income_cert_issue_date || 'N/A'}</span></div>
              </div>
            </div>

            {/* Review Section 3 */}
            <div className="border border-gray-300 bg-white">
              <div className="bg-gray-100 px-3 py-2 flex items-center justify-between border-b border-gray-300 font-bold text-[#AC3D47]">
                <span>3. Academic Performance</span>
                <button type="button" onClick={() => setStep(3)} className="text-xs font-semibold text-[#AC3D47] hover:underline">
                  Edit Block ✎
                </button>
              </div>
              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div><span className="text-gray-500">CET Admitted:</span> <span className="font-bold">{formData.admitted_through_cet ? 'Yes (CET Quota)' : 'No (Non-CET)'}</span></div>
                <div><span className="text-gray-500">Last Exam:</span> <span>{formData.last_exam_passed || 'N/A'}</span></div>
                <div><span className="text-gray-500">Marks:</span> <span className="font-mono">{formData.marks_obtained} / {formData.marks_gross_total}</span></div>
                <div><span className="text-gray-500">Percentage:</span> <span className="font-bold text-[#AC3D47]">{formData.percentage}%</span></div>
                <div><span className="text-gray-500">Course:</span> <span>{formData.course}</span></div>
                <div><span className="text-gray-500">Year / Sem:</span> <span>Year {formData.year_of_study}, Sem {formData.semester}</span></div>
                {formData.cgpa !== undefined && formData.cgpa !== null && (
                  <div><span className="text-gray-500">CGPA:</span> <span className="font-bold font-mono">{formData.cgpa} / 10.0</span></div>
                )}
                {formData.year_of_study > 1 && (
                  <div><span className="text-gray-500">Backlog History:</span> <span className={formData.has_backlog_history ? 'text-red-700 font-bold' : 'text-emerald-700 font-bold'}>{formData.has_backlog_history ? 'Yes' : 'No'}</span></div>
                )}
              </div>
            </div>

            {/* Review Section 4 & 5 */}
            <div className="border border-gray-300 bg-white">
              <div className="bg-gray-100 px-3 py-2 flex items-center justify-between border-b border-gray-300 font-bold text-[#AC3D47]">
                <span>4 & 5. Fees, Assistance & Bank Details</span>
                <button type="button" onClick={() => setStep(4)} className="text-xs font-semibold text-[#AC3D47] hover:underline">
                  Edit Block ✎
                </button>
              </div>
              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div><span className="text-gray-500">{feeLabel}:</span> <span className="font-bold">Rs. {(formData.annual_fee || 0).toLocaleString('en-IN')}</span></div>
                <div><span className="text-gray-500">Scholarship Req/Mo:</span> <span className="font-bold text-[#AC3D47]">Rs. {(formData.scholarship_amount_required_per_month || 0).toLocaleString('en-IN')}</span></div>
                <div><span className="text-gray-500">Bank Name:</span> <span>{formData.bank_name || 'N/A'}</span></div>
                <div><span className="text-gray-500">Account No:</span> <span className="font-mono">{formData.bank_acc_no || 'N/A'}</span></div>
                <div><span className="text-gray-500">IFSC:</span> <span className="font-mono uppercase">{formData.bank_ifsc || 'N/A'}</span></div>
                <div><span className="text-gray-500">Branch:</span> <span>{formData.bank_branch || 'N/A'}</span></div>
              </div>
            </div>

            {/* Uploaded Files Summary */}
            <div className="border border-gray-300 bg-white p-3">
              <div className="flex items-center justify-between font-bold text-[#AC3D47] mb-2">
                <span>6. Enclosures & Files Status</span>
                <button type="button" onClick={() => setStep(6)} className="text-xs font-semibold text-[#AC3D47] hover:underline">
                  Edit Uploads ✎
                </button>
              </div>
              <div className="text-xs text-gray-600">
                Uploaded {files.length} file(s) out of 9 required items (Photo, 2 Signatures, 6 Enclosures).
              </div>
            </div>

            {/* Minor Guardian Consent (DPDP Act 2023) */}
            {REQUIRE_GUARDIAN_CONSENT_FOR_MINORS && formData.dob && isApplicantMinor(formData.dob) && (
              <div className="border-2 border-amber-500 bg-amber-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.5 uppercase">
                    Mandatory: Minor Applicant (&lt; 18 Years)
                  </span>
                  <span className="text-[11px] font-bold text-amber-900">
                    DPDP Act 2023 Parental / Guardian Consent
                  </span>
                </div>
                <p className="text-[11px] text-amber-950 leading-relaxed">
                  As the applicant is under 18 years of age on the date of application, parental / lawful guardian consent is mandatory under the DPDP Act 2023.
                </p>

                <div>
                  <label className="block font-bold text-gray-800 mb-1" htmlFor="guardian-consent-name">
                    Full Name of Parent / Lawful Guardian <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="guardian-consent-name"
                    type="text"
                    required
                    value={formData.guardian_consent_name || ''}
                    onChange={(e) => setFormData({ ...formData, guardian_consent_name: e.target.value.toUpperCase() })}
                    placeholder="ENTER PARENT / GUARDIAN FULL NAME"
                    className="gov-input uppercase max-w-md bg-white"
                  />
                  {fieldErrors.guardian_consent_name && (
                    <p className="text-red-600 text-xs font-bold mt-1">{fieldErrors.guardian_consent_name[0]}</p>
                  )}
                </div>

                <div className="border border-amber-300 bg-white p-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={formData.guardian_consent_accepted === true}
                      onChange={(e) => setFormData({ ...formData, guardian_consent_accepted: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded-none border-gray-400 text-[#AC3D47] focus:ring-[#AC3D47]"
                    />
                    <span className="text-xs text-gray-900 leading-relaxed font-medium">
                      <strong>TODO [COLLEGE DECISION REQUIRED]: Guardian Consent: </strong>
                      I, the lawful parent / guardian of the minor applicant, hereby consent to the processing of personal data for the scholarship application under DPDP Act 2023.
                    </span>
                  </label>
                  {fieldErrors.guardian_consent_accepted && (
                    <p className="text-red-600 text-xs font-bold mt-1.5">{fieldErrors.guardian_consent_accepted[0]}</p>
                  )}
                </div>
              </div>
            )}

            {/* Declaration Checkbox */}
            <div className="border-2 border-[#AC3D47] bg-[#FDF5F6] p-4">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={formData.declaration_accepted === true}
                  onChange={(e) => setFormData({ ...formData, declaration_accepted: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded-none border-gray-400 text-[#AC3D47] focus:ring-[#AC3D47]"
                />
                <span className="text-xs text-gray-900 leading-relaxed font-medium">
                  <strong>{lang === 'kn' ? 'ಘೋಷಣೆ: ' : 'Declaration: '}</strong> {t.declaration_text}
                </span>
              </label>
              {fieldErrors.declaration_accepted && (
                <p className="text-red-600 text-xs font-bold mt-1.5">{fieldErrors.declaration_accepted[0]}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
              <a
                href={`/api/applications/${application?.id}/pdf?draft=true`}
                target="_blank"
                rel="noopener noreferrer"
                className="gov-btn gov-btn-secondary text-xs w-full sm:w-auto"
              >
                {lang === 'kn' ? 'ಕರಡು ಪಿಡಿಎಫ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ' : 'Download Draft Preview PDF'}
              </a>

              <button
                type="button"
                onClick={handleSubmitFinal}
                disabled={
                  submitting ||
                  !formData.declaration_accepted ||
                  Boolean(
                    REQUIRE_GUARDIAN_CONSENT_FOR_MINORS &&
                      formData.dob &&
                      isApplicantMinor(formData.dob) &&
                      (!formData.guardian_consent_accepted || !formData.guardian_consent_name)
                  )
                }
                className="gov-btn gov-btn-primary text-sm font-bold w-full sm:w-auto min-h-[44px] disabled:opacity-50"
              >
                {submitting ? (lang === 'kn' ? 'ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ...' : 'Submitting Application...') : t.submit_application}
              </button>
            </div>
          </div>
        )}

        {/* Wizard Bottom Navigation Buttons */}
        {step < 7 && (
          <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-6">
            <button
              type="button"
              onClick={handlePrev}
              disabled={step === 1}
              className="gov-btn gov-btn-secondary text-xs disabled:opacity-40"
            >
              ← {t.previous}
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={saving}
              className="gov-btn gov-btn-primary text-xs font-bold min-h-[44px]"
            >
              {saving ? (lang === 'kn' ? 'ಉಳಿಸಲಾಗುತ್ತಿದೆ...' : 'Saving...') : `${t.next} →`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
