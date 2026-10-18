import React from 'react';
import Link from 'next/link';

export default function ApplyOverview({ code }: { code: string }) {
  const isSSKA = code.toUpperCase() === 'SSKA';
  const schName = isSSKA
    ? 'Sri Sripathi K A Memorial Scholarship'
    : 'Meritorious & Needs-Cum Scholarship (MNC)';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs text-gray-500 flex items-center gap-1.5" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[#AC3D47]">Home</Link>
        <span>/</span>
        <Link href="/#scholarships" className="hover:text-[#AC3D47]">Scholarships</Link>
        <span>/</span>
        <span className="text-[#AC3D47] font-semibold">{code.toUpperCase()}</span>
      </nav>

      {/* Scheme Header */}
      <div className="border border-gray-300 bg-white p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <span className="font-mono text-xs font-bold bg-[#EEF1F6] text-[#AC3D47] px-2.5 py-1 border border-gray-300">
            SCHOLARSHIP CODE: {code.toUpperCase()}
          </span>
          <span className="text-xs px-2.5 py-1 font-bold uppercase w-fit bg-emerald-100 text-emerald-800 border border-emerald-300">
            Accepting Applications
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-[#AC3D47] mb-2">
          Apply for {schName}
        </h1>

        <div className="text-xs text-gray-500 mb-4">
          Siddaganga Institute of Technology, Tumakuru | Academic Year 2026–2027
        </div>

        {/* Authentication Callout */}
        <div className="bg-[#FDF5F6] border border-[#AC3D47]/30 p-4 mb-6">
          <h2 className="text-sm font-bold text-[#AC3D47] mb-1">
            Student Authentication Required
          </h2>
          <p className="text-xs text-gray-700 leading-relaxed mb-4">
            To apply for this scholarship or continue an existing application, please log in with your SIT student credentials. New students must register an account first.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/login?redirect=/apply/${code.toUpperCase()}`}
              className="gov-btn gov-btn-primary text-xs py-2 px-4 min-h-[38px] font-bold inline-flex items-center"
            >
              Sign In to Apply
            </Link>
            <Link
              href="/register"
              className="gov-btn gov-btn-outline text-xs py-2 px-4 min-h-[38px] inline-flex items-center"
            >
              Register New Student
            </Link>
          </div>
        </div>

        {/* Overview of 7-Step Process */}
        <div className="border-t border-gray-200 pt-5">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
            Application Process (7 Steps)
          </h3>
          <ol className="text-xs text-gray-600 space-y-2 list-decimal list-inside">
            <li><strong>Student Identity:</strong> USN, full name as per SSLC, date of birth, gender, category.</li>
            <li><strong>Academic Records:</strong> Course, semester, branch, marks, and percentage.</li>
            <li><strong>Family & Income:</strong> Parents occupation, annual family income, {isSSKA ? 'Tuition fee' : 'Total annual fee'}.</li>
            <li><strong>Bank Particulars:</strong> Account number, IFSC code, bank branch, passbook proof.</li>
            <li><strong>Document Uploads:</strong> Enclosures (Marks card, Income certificate, Fee receipt, Study certificate).</li>
            <li><strong>References & Declarations:</strong> {isSSKA ? 'Proctor and Head of Department (HoD) recommendations' : 'Two referee contacts (Faculty/Gazetted Officer)'}.</li>
            <li><strong>Final Review:</strong> Complete checklist preview and digital applicant declaration.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
