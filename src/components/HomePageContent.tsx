'use client';

import React from 'react';
import Link from 'next/link';
import { Scholarship, AcademicCycle } from '@/lib/types';
import { useLanguage } from '@/components/LanguageToggle';

interface HomePageContentProps {
  scholarships: Scholarship[];
  cycles: AcademicCycle[];
}

export default function HomePageContent({ scholarships, cycles }: HomePageContentProps) {
  const { t, lang } = useLanguage();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Official College Notice Bar */}
      <div className="border border-[#AC3D47]/30 bg-[#FDF5F6] p-4 mb-8 text-sm text-[#AC3D47]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="font-bold uppercase tracking-wider bg-[#AC3D47] text-white px-2 py-0.5 text-xs mr-2">
              {lang === 'kn' ? 'ಅಧಿಕೃತ ಸೂಚನೆ' : 'Official Notification'}
            </span>
            <span className="font-semibold text-gray-900">
              {t.home_badge}
            </span>
          </div>
          <div className="text-xs text-gray-600 shrink-0 font-medium">
            Ref: SIT/SCH/2026/01
          </div>
        </div>
      </div>

      {/* Main Heading & Intro */}
      <div className="mb-8 border-b border-gray-300 pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#AC3D47] mb-2">
          {t.portal_title}
        </h1>
        <p className="text-gray-700 max-w-3xl leading-relaxed text-sm sm:text-base">
          {t.home_intro}
        </p>
      </div>

      {/* Available Scholarships Section */}
      <div className="mb-10">
        <div className="gov-header-bar mb-4 flex items-center justify-between">
          <h2 className="text-base uppercase tracking-wide">
            {t.home_available_schemes}
          </h2>
          <span className="text-xs font-normal text-gray-600">
            {t.academic_year}: 2026–2027
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scholarships.map((sch) => {
            const cycle = cycles.find((c) => c.scholarship_id === sch.id && c.status === 'open');
            const deadline = cycle
              ? new Date(cycle.closes_at).toLocaleDateString(lang === 'kn' ? 'kn-IN' : 'en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : t.status_closed;

            return (
              <div
                key={sch.code}
                className={`gov-card flex flex-col justify-between ${
                  sch.active ? 'border-gray-300' : 'border-gray-200 bg-gray-50 opacity-80'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono font-bold text-xs bg-[#EEF1F6] text-[#AC3D47] px-2 py-1 border border-gray-300">
                      CODE: {sch.code}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 font-bold uppercase ${
                        sch.active
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {sch.active ? t.status_open : t.status_closed}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-[#AC3D47] leading-snug mb-2">
                    {sch.name}
                  </h3>

                  <p className="text-xs text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                    {sch.description || 'Institutional financial assistance scheme administered by college committee.'}
                  </p>

                  <div className="space-y-1.5 text-xs border-t border-gray-200 pt-3 text-gray-700">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t.basis_label}</span>
                      <span className="font-semibold">
                        {sch.code === 'MNC' ? t.basis_merit_means : sch.code === 'SSKA' ? t.basis_need : t.basis_welfare}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t.income_limit_label}</span>
                      <span className="font-semibold">
                        {sch.rules.income_limit ? `Rs. ${sch.rules.income_limit.toLocaleString('en-IN')}/yr` : (lang === 'kn' ? 'ನಿಯಮಗಳ ಪ್ರಕಾರ' : 'As per norms')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t.closing_date_label}</span>
                      <span className="font-semibold text-red-700">{deadline}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 bg-[#FAFAFA] p-4 flex gap-2">
                  <Link
                    href={`/scholarships/${sch.code}`}
                    className="gov-btn gov-btn-secondary text-xs flex-1"
                  >
                    {t.view_details}
                  </Link>
                  {sch.active ? (
                    <Link
                      href={`/apply/${sch.code}`}
                      className="gov-btn gov-btn-primary text-xs flex-1"
                    >
                      {t.apply_now}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="gov-btn gov-btn-secondary text-xs flex-1 opacity-50 cursor-not-allowed"
                    >
                      {lang === 'kn' ? 'ಲಭ್ಯವಿಲ್ಲ' : 'Not Available'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* How to Apply / Guidelines Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="gov-card p-5">
          <h3 className="font-bold text-[#AC3D47] text-sm uppercase tracking-wider mb-3 border-b border-gray-200 pb-2">
            {t.rules_title}
          </h3>
          <ul className="text-xs text-gray-700 space-y-2 list-disc list-inside leading-relaxed">
            <li>{t.rules_cet}</li>
            <li>{t.rules_income}</li>
            <li>{t.rules_backlog}</li>
            <li>{t.rules_assistance}</li>
            <li><strong>{lang === 'kn' ? 'ಆಯ್ಕೆಯ ವಿಧಾನ: ' : 'Selection Method: '}</strong>{t.rules_selection}</li>
          </ul>
        </div>

        <div className="gov-card p-5">
          <h3 className="font-bold text-[#AC3D47] text-sm uppercase tracking-wider mb-3 border-b border-gray-200 pb-2">
            {t.docs_title}
          </h3>
          <ol className="text-xs text-gray-700 space-y-1.5 list-decimal list-inside leading-relaxed">
            <li>{t.doc_photo}</li>
            <li>{t.doc_sigs}</li>
            <li>{t.doc_cet}</li>
            <li>{t.doc_marks}</li>
            <li>{t.doc_income}</li>
            <li>{t.doc_aadhaar}</li>
            <li>{t.doc_fee}</li>
            <li>{t.doc_principal}</li>
          </ol>
        </div>
      </div>

      {/* Staff Login Fast Action Box */}
      <div className="border border-gray-300 bg-[#EEF1F6] p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-bold text-[#AC3D47]">{t.admin_banner_title} </span>
          <span>{t.admin_banner_desc}</span>
        </div>
        <Link
          href="/login"
          className="gov-btn gov-btn-outline text-xs whitespace-nowrap bg-white py-1 px-3 min-h-[36px]"
        >
          {t.admin_login_btn}
        </Link>
      </div>
    </div>
  );
}
