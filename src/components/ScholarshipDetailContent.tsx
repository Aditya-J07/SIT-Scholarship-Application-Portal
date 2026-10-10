'use client';

import React from 'react';
import Link from 'next/link';
import { Scholarship, AcademicCycle } from '@/lib/types';
import { useLanguage } from '@/components/LanguageToggle';

interface ScholarshipDetailContentProps {
  scholarship: Scholarship;
  cycle: AcademicCycle | null;
}

export default function ScholarshipDetailContent({ scholarship, cycle }: ScholarshipDetailContentProps) {
  const { t, lang } = useLanguage();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs text-gray-500 flex items-center gap-1.5" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[#AC3D47]">{t.home}</Link>
        <span>/</span>
        <span className="text-[#AC3D47] font-semibold">{scholarship.code}</span>
      </nav>

      {/* Header Card */}
      <div className="border border-gray-300 bg-white p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <span className="font-mono text-xs font-bold bg-[#EEF1F6] text-[#AC3D47] px-2.5 py-1 border border-gray-300">
            {lang === 'kn' ? 'ಯೋಜನಾ ಕೋಡ್: ' : 'SCHOLARSHIP CODE: '}{scholarship.code}
          </span>
          <span
            className={`text-xs px-2.5 py-1 font-bold uppercase w-fit ${
              scholarship.active
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-gray-100 text-gray-600 border border-gray-300'
            }`}
          >
            {scholarship.active ? (lang === 'kn' ? 'ಅರ್ಜಿ ಸ್ವೀಕರಿಸಲಾಗುತ್ತಿದೆ' : 'Accepting Applications') : (lang === 'kn' ? 'ನಿಷ್ಕ್ರಿಯ' : 'Inactive / Awaiting Circular')}
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-[#AC3D47] mb-3">
          {scholarship.name}
        </h1>

        <p className="text-sm text-gray-700 leading-relaxed">
          {scholarship.description}
        </p>
      </div>

      {/* Rules and Eligibility Table */}
      <div className="border border-gray-300 bg-white mb-6">
        <div className="gov-header-bar">
          <h2 className="text-sm uppercase tracking-wide">
            {lang === 'kn' ? 'ಅಧಿಕೃತ ಅರ್ಹತಾ ಮಾರ್ಗಸೂಚಿಗಳು ಮತ್ತು ಷರತ್ತುಗಳು' : 'Official Eligibility Guidelines & Conditions'}
          </h2>
        </div>
        <div className="p-5 text-sm">
          <table className="w-full text-left border-collapse border border-gray-300 text-xs sm:text-sm">
            <tbody>
              <tr className="border-b border-gray-300 bg-gray-50">
                <th className="p-3 border-r border-gray-300 font-bold w-1/3 text-gray-800">
                  {lang === 'kn' ? 'ಪ್ರವೇಶದ ವಿಧಾನ' : 'Admission Channel'}
                </th>
                <td className="p-3 text-gray-700">
                  {scholarship.rules.cet_required
                    ? (lang === 'kn' ? 'ಸಾಮಾನ್ಯ ಪ್ರವೇಶ ಪರೀಕ್ಷೆ (CET) ಕೋಟಾದಡಿ ಮಾತ್ರ. ಸಿಇಟಿ ರಹಿತ ಸೀಟುಗಳು ಅರ್ಹವಲ್ಲ.' : 'Common Entrance Test (CET) Quota only. Non-CET seats ineligible.')
                    : (lang === 'kn' ? 'ಸಿಇಟಿ / ಕಾಲೇಜು ಮೆರಿಟ್ ಪ್ರವೇಶ' : 'CET / College Merit Admission')}
                </td>
              </tr>
              <tr className="border-b border-gray-300">
                <th className="p-3 border-r border-gray-300 font-bold text-gray-800">
                  {lang === 'kn' ? 'ಗರಿಷ್ಠ ವಾರ್ಷಿಕ ಕುಟುಂಬ ಆದಾಯ' : 'Maximum Family Annual Income'}
                </th>
                <td className="p-3 text-gray-700">
                  {scholarship.rules.income_limit
                    ? (lang === 'kn' ? `ಎಲ್ಲಾ ಮೂಲಗಳಿಂದ ಗರಿಷ್ಠ ರೂ. ${scholarship.rules.income_limit.toLocaleString('en-IN')}/-` : `Rs. ${scholarship.rules.income_limit.toLocaleString('en-IN')}/- per annum from all sources`)
                    : (lang === 'kn' ? 'ಸಮಿತಿಯ ಮೌಲ್ಯಮಾಪನಕ್ಕೆ ಒಳಪಟ್ಟಿರುತ್ತದೆ' : 'Subject to committee assessment')}
                </td>
              </tr>
              <tr className="border-b border-gray-300 bg-gray-50">
                <th className="p-3 border-r border-gray-300 font-bold text-gray-800">
                  {lang === 'kn' ? 'ಶೈಕ್ಷಣಿಕ ಸಾಧನೆ ಮತ್ತು ಮೆರಿಟ್' : 'Academic Performance & Merit'}
                </th>
                <td className="p-3 text-gray-700">
                  {scholarship.code === 'MNC' ? (
                    <div>
                      <div>• <strong>{lang === 'kn' ? '1 ನೇ ವರ್ಷ ಬಿ.ಇ:' : '1st Year B.E.:'}</strong> {lang === 'kn' ? 'ದ್ವಿತೀಯ ಪಿಯುಸಿ (ಅಥವಾ ತತ್ಸಮಾನ) ಅಂಕಗಳ ಶೇಕಡಾವಾರು ಆಧಾರದ ಮೇಲೆ ಶ್ರೇಯಾಂಕ.' : 'Ranked on II PUC (or equivalent) marks percentage.'}</div>
                      <div>• <strong>{lang === 'kn' ? '2 ರಿಂದ 4 ನೇ ವರ್ಷ ಬಿ.ಇ:' : '2nd to 4th Year B.E.:'}</strong> {lang === 'kn' ? 'ಹಿಂದಿನ ವರ್ಷದ ಸಿ.ಜಿ.ಪಿ.ಎ ಆಧಾರದ ಮೇಲೆ ಮತ್ತು ಕಟ್ಟುನಿಟ್ಟಾಗಿ ಯಾವುದೇ ಬಾಕಿ ವಿಷಯಗಳಿಲ್ಲದಿರುವುದು (No Backlogs).' : 'Ranked on previous year CGPA with strictly no backlog history.'}</div>
                    </div>
                  ) : (
                    lang === 'kn' ? 'ಪ್ರಸ್ತುತ ಶೈಕ್ಷಣಿಕ ಸೆಮಿಸ್ಟರ್ ಅಂಕಗಳು ಮತ್ತು ಅಧ್ಯಾಪಕರ ಶಿಫಾರಸಿನ ಆಧಾರದ ಮೇಲೆ ಮೌಲ್ಯಮಾಪನ ಮಾಡಲಾಗುತ್ತದೆ.' : 'Evaluated based on current academic semester scores and faculty recommendation.'
                  )}
                </td>
              </tr>
              <tr className="border-b border-gray-300">
                <th className="p-3 border-r border-gray-300 font-bold text-gray-800">
                  {lang === 'kn' ? 'ಇತರ ಆರ್ಥಿಕ ನೆರವು' : 'Other Financial Assistance'}
                </th>
                <td className="p-3 text-gray-700">
                  {lang === 'kn'
                    ? 'ಒಟ್ಟು ವಾರ್ಷಿಕ ಕಾಲೇಜು ಶುಲ್ಕದ 30% ಕ್ಕಿಂತ ಹೆಚ್ಚಿನ ಇತರ ಯಾವುದೇ ವಿದ್ಯಾರ್ಥಿವೇತನ ಅಥವಾ ಆರ್ಥಿಕ ನೆರವು ಪಡೆಯುತ್ತಿರುವ ವಿದ್ಯಾರ್ಥಿಗಳು ಅರ್ಹರಲ್ಲ.'
                    : 'Students receiving stipends or financial assistance exceeding 30% of total annual college fees are ineligible.'}
                </td>
              </tr>
              <tr className="border-b border-gray-300 bg-gray-50">
                <th className="p-3 border-r border-gray-300 font-bold text-gray-800">
                  {lang === 'kn' ? 'ಶುಲ್ಕ ಉಲ್ಲೇಖದ ಆಧಾರ' : 'Fee Reference Basis'}
                </th>
                <td className="p-3 text-gray-700">
                  {scholarship.fee_label} ({lang === 'kn' ? 'ವಿದ್ಯಾರ್ಥಿವೇತನ ಗರಿಷ್ಠ ಮಿತಿ: ವಾರ್ಷಿಕ ಶುಲ್ಕದ 50%' : 'Scholarship maximum: 50% of annual fee'})
                </td>
              </tr>
              {scholarship.requires_recommendation && (
                <tr className="border-b border-gray-300">
                  <th className="p-3 border-r border-gray-300 font-bold text-gray-800">
                    {lang === 'kn' ? 'ಅಧ್ಯಾಪಕರ ಶಿಫಾರಸು' : 'Faculty Recommendations'}
                  </th>
                  <td className="p-3 text-gray-700 font-semibold text-[#AC3D47]">
                    {lang === 'kn' ? 'ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥರು (HoD) ಮತ್ತು ಪ್ರಾಕ್ಟರ್‌ರಿಂದ ಅಧಿಕೃತ ಶಿಫಾರಸು ಪತ್ರ ಕಡ್ಡಾಯ.' : 'Official Recommendation from Proctor and Head of the Department (HoD) required on form.'}
                  </td>
                </tr>
              )}
              <tr className="bg-gray-50">
                <th className="p-3 border-r border-gray-300 font-bold text-gray-800">
                  {lang === 'kn' ? 'ಆಯ್ಕೆಯ ಪ್ರಕ್ರಿಯೆ ಮತ್ತು ಕೋಟಾ' : 'Selection Quota & Process'}
                </th>
                <td className="p-3 text-gray-700">
                  {scholarship.code === 'MNC' ? (
                    lang === 'kn'
                      ? 'ಪ್ರತಿ ಶೈಕ್ಷಣಿಕ ಚಕ್ರದಲ್ಲಿ ಒಟ್ಟು 4 ವಿದ್ಯಾರ್ಥಿವೇತನಗಳು: 1, 2, 3 ಮತ್ತು 4 ನೇ ವರ್ಷದ ಬಿ.ಇ ಗೆ ತಲಾ ಒಂದು. ಕಾಲೇಜು ಪರಿಶೀಲನಾ ಸಮಿತಿಯು ಶೈಕ್ಷಣಿಕ ಮೆರಿಟ್ ಮತ್ತು ಕುಟುಂಬದ ಆರ್ಥಿಕ ಅಗತ್ಯತೆಯ ಆಧಾರದ ಮೇಲೆ ಕಟ್ಟುನಿಟ್ಟಾಗಿ ಆಯ್ಕೆ ಮಾಡುತ್ತದೆ.'
                      : 'Four total scholarships awarded per cycle: One scholarship each for 1st, 2nd, 3rd, and 4th year B.E., selected strictly on academic merit and family income by the College Scrutiny Committee.'
                  ) : (
                    lang === 'kn' ? 'ಲಭ್ಯವಿರುವ ನಿಧಿಯ ಆಧಾರದ ಮೇಲೆ ಕಾಲೇಜು ಸಮಿತಿಯಿಂದ ನಿರ್ಧರಿಸಲಾಗುತ್ತದೆ.' : 'Determined by College Committee based on funds available.'
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Mandatory Enclosures */}
      <div className="border border-gray-300 bg-white p-5 mb-6">
        <h3 className="font-bold text-[#AC3D47] text-sm uppercase tracking-wider mb-3">
          {lang === 'kn' ? 'ಕಡ್ಡಾಯವಾಗಿ ಲಗತ್ತಿಸಬೇಕಾದ ಪ್ರಮಾಣಪತ್ರಗಳು' : 'Required Attested Enclosures'}
        </h3>
        <ol className="text-xs text-gray-700 space-y-1.5 list-decimal list-inside">
          <li>{t.doc_cet}</li>
          <li>{t.doc_marks}</li>
          <li>{t.doc_income}</li>
          <li>{t.doc_aadhaar}</li>
          <li>{t.doc_fee}</li>
          <li>{t.doc_principal}</li>
        </ol>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border border-gray-300 bg-[#FAFAFA] p-4">
        <div>
          <div className="text-xs font-semibold text-gray-600">{lang === 'kn' ? 'ಅರ್ಜಿ ಸಲ್ಲಿಕೆಯ ಅವಧಿ:' : 'Application Cycle Window:'}</div>
          <div className="text-sm font-bold text-[#AC3D47]">
            {cycle
              ? `${new Date(cycle.opens_at).toLocaleDateString(lang === 'kn' ? 'kn-IN' : 'en-IN')} - ${new Date(cycle.closes_at).toLocaleDateString(lang === 'kn' ? 'kn-IN' : 'en-IN')}`
              : t.status_closed}
          </div>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <Link href="/" className="gov-btn gov-btn-secondary text-xs flex-1 sm:flex-initial">
            ← {lang === 'kn' ? 'ಹಿಂದಕ್ಕೆ' : 'Back to List'}
          </Link>
          {scholarship.active ? (
            <Link
              href={`/apply/${scholarship.code}`}
              className="gov-btn gov-btn-primary text-xs flex-1 sm:flex-initial"
            >
              {t.apply_now} →
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="gov-btn gov-btn-secondary text-xs opacity-50 cursor-not-allowed"
            >
              {lang === 'kn' ? 'ಲಭ್ಯವಿಲ್ಲ' : 'Form Not Available'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
