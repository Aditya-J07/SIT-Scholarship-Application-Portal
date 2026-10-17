'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageToggle';

export default function TermsPage() {
  const { lang } = useLanguage();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="gov-card p-6 sm:p-8 border-gray-300">
        
        {/* Header */}
        <div className="border-b border-gray-300 pb-5 mb-6">
          <div className="text-xs font-bold uppercase tracking-widest text-gray-500">
            Siddaganga Institute of Technology, Tumakuru
          </div>
          <h1 className="text-2xl font-bold text-[#AC3D47] mt-1">
            {lang === 'kn' ? 'ಪೋರ್ಟಲ್ ಬಳಕೆಯ ನಿಯಮಗಳು ಮತ್ತು ಷರತ್ತುಗಳು' : 'Terms of Use & Application Guidelines'}
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            {lang === 'kn'
              ? 'ವಿದ್ಯಾರ್ಥಿವೇತನ ಅರ್ಜಿ ಪೋರ್ಟಲ್‌ನ ಅಧಿಕೃತ ನಿಯಮಾವಳಿಗಳು | ಶೈಕ್ಷಣಿಕ ವರ್ಷ 2026–2027'
              : 'Institutional Rules & Portal Governing Conditions | Academic Year 2026–2027'}
          </p>
          {lang === 'kn' && (
            <div className="mt-2 inline-block bg-amber-50 border border-amber-300 px-2 py-0.5 text-[11px] font-mono text-amber-800">
              TODO: review by college (ಕಾಲೇಜು ಆಡಳಿತ ಮಂಡಳಿಯಿಂದ ಕನ್ನಡ ಪರಿಶೀಲನೆ ಬಾಕಿ ಇದೆ)
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="space-y-6 text-xs text-gray-800 leading-relaxed">

          {/* Section 1: Scope */}
          <section>
            <h2 className="text-sm font-bold text-[#AC3D47] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
              1. {lang === 'kn' ? 'ವಿದ್ಯಾರ್ಥಿವೇತನ ಯೋಜನೆಗಳ ವ್ಯಾಪ್ತಿ' : 'Scope of the Scholarship Portal'}
            </h2>
            <p>
              {lang === 'kn'
                ? 'ಈ ಪೋರ್ಟಲ್ ಅನ್ನು ಸಿದ್ಧಗಂಗಾ ತಾಂತ್ರಿಕ ಮಹಾವಿದ್ಯಾಲಯದಲ್ಲಿ (ಎಸ್.ಐ.ಟಿ) ಓದುತ್ತಿರುವ ಅರ್ಹ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಕಾಲೇಜಿನ ಸಾಂಸ್ಥಿಕ ವಿದ್ಯಾರ್ಥಿವೇತನಗಳಿಗೆ ಮಾತ್ರ ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಅಭಿವೃದ್ಧಿಪಡಿಸಲಾಗಿದೆ. ಈ ಪೋರ್ಟಲ್ ಪ್ರಸ್ತುತ ಕೆಳಗಿನ ಅಧಿಕೃತ ಯೋಜನೆಗಳಿಗೆ ಸೀಮಿತವಾಗಿದೆ:'
                : 'This portal is maintained exclusively for students currently enrolled at Siddaganga Institute of Technology (SIT), Tumakuru. Online applications are accepted strictly for the following institutional financial assistance schemes:'}
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 mt-2 text-gray-700">
              <li>
                <strong>Dr. M.N. Channabasappa Endowment Fund (MNC)</strong> –{' '}
                {lang === 'kn'
                  ? 'ಸಿಇಟಿ ಮೂಲಕ ಪ್ರವೇಶ ಪಡೆದ, ಬ್ಯಾಕ್‌ಲಾಗ್ ಇಲ್ಲದ, ಮತ್ತು ವಾರ್ಷಿಕ ಕುಟುಂಬ ಆದಾಯ ರೂ. 3,00,000/- ಒಳಗಿರುವ ಬಿ.ಇ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಮೀಸಲಾಗಿದೆ.'
                  : 'Merit-cum-means assistance for B.E. students admitted under CET quota with zero active/past backlogs and annual family income ≤ Rs. 3,00,000/-.'}
              </li>
              <li>
                <strong>Sri Sripathi K A Memorial Scholarship (SSKA)</strong> –{' '}
                {lang === 'kn'
                  ? 'ಬಡ ಮತ್ತು ಪ್ರತಿಭಾವಂತ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಟ್ಯೂಷನ್ ಶುಲ್ಕ ನೆರವು, ಪ್ರೊಕ್ಟರ್ ಮತ್ತು ವಿಭಾಗ ಮುಖ್ಯಸ್ಥರ (HOD) ಕಡ್ಡಾಯ ಶಿಫಾರಸು ಅಗತ್ಯವಿದೆ.'
                  : 'Tuition fee aid for economically deserving students, requiring mandatory recommendation from Proctor and Head of Department.'}
              </li>
              <li>
                <strong>SIT Institutional Financial Assistance Schemes</strong> –{' '}
                {lang === 'kn'
                  ? 'ಕಾಲೇಜು ಆಡಳಿತ ಮಂಡಳಿಯು ಕಾಲಕಾಲಕ್ಕೆ ಪ್ರಕಟಿಸುವ ಇತರೆ ವಿದ್ಯಾರ್ಥಿ ಕಲ್ಯಾಣ ಸಹಾಯಧನಗಳು.'
                  : 'Other endowment and college financial assistance schemes as notified by the Governing Council.'}
              </li>
            </ul>
          </section>

          {/* Section 2: Committee Authority */}
          <section>
            <h2 className="text-sm font-bold text-[#AC3D47] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
              2. {lang === 'kn' ? 'ಆಯ್ಕೆ ಮತ್ತು ಸಮಿತಿಯ ಅಂತಿಮ ನಿರ್ಧಾರ' : 'Authority of the Scholarship Scrutiny Committee'}
            </h2>
            <div className="border border-gray-300 bg-gray-50 p-3 leading-relaxed">
              <p className="font-semibold text-gray-900 mb-1">
                {lang === 'kn'
                  ? 'ಅಂತಿಮ ಅರ್ಹತೆ ಮತ್ತು ಆಯ್ಕೆಯು ಕಾಲೇಜು ವಿದ್ಯಾರ್ಥಿವೇತನ ಪರಿಶೀಲನಾ ಸಮಿತಿಯ ವಿವೇಚನೆಗೆ ಒಳಪಟ್ಟಿರುತ್ತದೆ.'
                  : 'Final eligibility, candidate shortlisting, and awards are decided solely by the College Scholarship Committee.'}
              </p>
              <p>
                {lang === 'kn'
                  ? 'ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಕೇವಲ ಅರ್ಜಿ ಸಲ್ಲಿಸುವುದರಿಂದಲೇ ವಿದ್ಯಾರ್ಥಿವೇತನದ ಹಕ್ಕು ದೊರೆಯುವುದಿಲ್ಲ. ಎಲ್ಲಾ ಅರ್ಜಿಗಳು ನಿಗದಿತ ಶೈಕ್ಷಣಿಕ ಮೆರಿಟ್ ಅಂಕಗಳು, ಕೌಟುಂಬಿಕ ಆದಾಯ ಪ್ರಮಾಣಪತ್ರದ ಪರಿಶೀಲನೆ, ಮತ್ತು ಕೋಟಾ ಲಭ್ಯತೆಯ ಆಧಾರದ ಮೇಲೆ ಕಟ್ಟುನಿಟ್ಟಾಗಿ ಮೌಲ್ಯಮಾಪನಗೊಳ್ಳುತ್ತವೆ. ಸಮಿತಿಯ ಮತ್ತು ಪ್ರಾಂಶುಪಾಲರ ನಿರ್ಧಾರವೇ ಅಂತಿಮವಾಗಿರುತ್ತದೆ.'
                  : 'Submission of an application does not confer an automatic right or guarantee to receive a scholarship. Applications are evaluated strictly according to merit scores, verified income certificates, and branch/year quotas. The decision of the College Scholarship Scrutiny Committee and the Principal of SIT is final and binding in all cases.'}
              </p>
            </div>
          </section>

          {/* Section 3: False Information */}
          <section>
            <h2 className="text-sm font-bold text-[#AC3D47] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
              3. {lang === 'kn' ? 'ಸುಳ್ಳು ಮಾಹಿತಿ ಮತ್ತು ನಕಲಿ ದಾಖಲೆಗಳ ಮೇಲಿನ ಕ್ರಮ' : 'Zero Tolerance for False or Misleading Information'}
            </h2>
            <div className="border-l-4 border-red-600 bg-red-50 p-3 text-red-900 leading-relaxed">
              <p className="font-bold mb-1">
                {lang === 'kn'
                  ? 'ಸುಳ್ಳು ಅಥವಾ ತಿರುಚಿದ ದಾಖಲೆಗಳನ್ನು ಒದಗಿಸಿದರೆ ಅರ್ಜಿಯನ್ನು ತಕ್ಷಣವೇ ತಿರಸ್ಕರಿಸಲಾಗುತ್ತದೆ:'
                  : 'Immediate Rejection and Disciplinary Sanctions for Fraudulent Submissions:'}
              </p>
              <p>
                {lang === 'kn'
                  ? 'ಅರ್ಜಿಯಲ್ಲಿ ಯಾವುದೇ ತಪ್ಪು ಮಾಹಿತಿ, ನಕಲಿ ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ, ತಪ್ಪು ಅಂಕಗಳು, ಬ್ಯಾಂಕ್ ಖಾತೆಯ ತಪ್ಪು ವಿವರಗಳು ಅಥವಾ ಇತರ ವಿದ್ಯಾರ್ಥಿವೇತನ ವಿವರಗಳನ್ನು ಮುಚ್ಚಿಡುವುದು ಕಂಡುಬಂದಲ್ಲಿ, ಅರ್ಜಿಯನ್ನು ತಕ್ಷಣವೇ ತಿರಸ್ಕರಿಸಲಾಗುತ್ತದೆ. ಅಂತಹ ವಿದ್ಯಾರ್ಥಿಗಳ ವಿರುದ್ಧ ಕಾಲೇಜು ಶಿಸ್ತು ನಿಯಮಾವಳಿಗಳ ಅಡಿಯಲ್ಲಿ ಶಿಸ್ತುಕ್ರಮ ಕೈಗೊಳ್ಳಲಾಗುವುದು ಮತ್ತು ಯಾವುದೇ ಮಂಜೂರಾದ ಹಣವನ್ನು ವಸೂಲಿ ಮಾಡಲಾಗುವುದು.'
                  : 'Any falsification, misrepresentation, concealing of other scholarship assistance, submission of fabricated revenue/marks certificates, or fraudulent banking records will result in the immediate and permanent rejection of the application, cancellation of any awarded scholarship, recovery of disbursed funds, and initiation of college disciplinary proceedings.'}
              </p>
            </div>
          </section>

          {/* Section 4: Applicant Responsibilities */}
          <section>
            <h2 className="text-sm font-bold text-[#AC3D47] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
              4. {lang === 'kn' ? 'ಅರ್ಜಿದಾರರ ಜವಾಬ್ದಾರಿಗಳು' : 'Student Applicant Obligations'}
            </h2>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-gray-700">
              <li>
                <strong>{lang === 'kn' ? 'ಸ್ವಂತ ಬ್ಯಾಂಕ್ ಖಾತೆ: ' : 'Own Bank Account: '}</strong>
                {lang === 'kn'
                  ? 'ಬ್ಯಾಂಕ್ ಉಳಿತಾಯ ಖಾತೆಯು ಅರ್ಜಿದಾರ ವಿದ್ಯಾರ್ಥಿಯ ಹೆಸರಲ್ಲೇ ಇರಬೇಕು. ಯಾವುದೇ ಇತರ ವ್ಯಕ್ತಿಗಳ ಖಾತೆಗೆ ವಿದ್ಯಾರ್ಥಿವೇತನ ಮೊತ್ತವನ್ನು ವರ್ಗಾಯಿಸಲಾಗುವುದಿಲ್ಲ.'
                  : 'The bank account provided must be a valid, active savings bank account in the sole name of the student applicant.'}
              </li>
              <li>
                <strong>{lang === 'kn' ? 'ಒಂದು ಸೈಕಲ್‌ಗೆ ಒಂದು ಅರ್ಜಿ: ' : 'Single Application Per Cycle: '}</strong>
                {lang === 'kn'
                  ? 'ವಿದ್ಯಾರ್ಥಿಯು ಒಂದು ಶೈಕ್ಷಣಿಕ ಸೈಕಲ್‌ನಲ್ಲಿ ಒಂದು ಯೋಜನೆಗೆ ಒಂದು ಅರ್ಜಿಯನ್ನು ಮಾತ್ರ ಸಲ್ಲಿಸಬಹುದು. ನಕಲಿ ಅರ್ಜಿಗಳನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ನಿರ್ಬಂಧಿಸಲಾಗುತ್ತದೆ.'
                  : 'A student may submit only one application per scholarship scheme in any given academic cycle.'}
              </li>
              <li>
                <strong>{lang === 'kn' ? 'ಖಾತೆ ಸುರಕ್ಷತೆ: ' : 'Account Security & MFA: '}</strong>
                {lang === 'kn'
                  ? 'ಲಾಗಿನ್ ವಿವರಗಳನ್ನು ಗೌಪ್ಯವಾಗಿಡುವುದು ವಿದ್ಯಾರ್ಥಿಯ ಜವಾಬ್ದಾರಿಯಾಗಿದೆ. ಸೈಬರ್ ಸುರಕ್ಷತೆಗಾಗಿ ಪಾಸ್‌ವರ್ಡ್ ಅನ್ನು ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬಾರದು.'
                  : 'Students are responsible for maintaining the confidentiality of their credentials and securing access to their registered email.'}
              </li>
              <li>
                <strong>{lang === 'kn' ? 'ಭೌತಿಕ ಪ್ರತಿ ಸಲ್ಲಿಕೆ: ' : 'Hard Copy Verification: '}</strong>
                {lang === 'kn'
                  ? 'ಸಮಿತಿಯು ಕೋರಿದಲ್ಲಿ, ಕ್ಯೂಆರ್ ಕೋಡ್ ಹೊಂದಿರುವ ಮುದ್ರಿತ ಪಿಡಿಎಫ್ ಪ್ರತಿಯನ್ನು ಮೂಲ ದಾಖಲೆಗಳೊಂದಿಗೆ ಲೆಕ್ಕಪತ್ರ ವಿಭಾಗಕ್ಕೆ ತಲುಪಿಸುವುದು ಕಡ್ಡಾಯ.'
                  : 'If requested by the committee, students must submit the printed, signed PDF form with self-attested document photocopies to the Accounts Section.'}
              </li>
            </ul>
          </section>

          {/* Section 5: Amendments */}
          <section>
            <h2 className="text-sm font-bold text-[#AC3D47] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
              5. {lang === 'kn' ? 'ನಿಯಮಾವಳಿಗಳ ತಿದ್ದುಪಡಿ' : 'Governing Law and Jurisdiction'}
            </h2>
            <p>
              {lang === 'kn'
                ? 'ಈ ನಿಯಮಾವಳಿಗಳು ಭಾರತೀಯ ಶಾಸನಬದ್ಧ ಕಾನೂನುಗಳು ಮತ್ತು ಕರ್ನಾಟಕ ರಾಜ್ಯದ ನಿಯಮಗಳಿಗೆ ಒಳಪಟ್ಟಿರುತ್ತವೆ. ಯಾವುದೇ ವಿವಾದಗಳು ತುಮಕೂರು ವ್ಯಾಪ್ತಿಯ ನ್ಯಾಯಾಲಯಗಳ ಅಧಿಕಾರ ವ್ಯಾಪ್ತಿಗೆ ಮಾತ್ರ ಒಳಪಟ್ಟಿರುತ್ತವೆ.'
                : 'These terms are governed by the applicable laws of India and institutional regulations of SIT Tumakuru. Any disputes arising from this portal or scholarship processing shall be subject exclusively to the jurisdiction of competent courts in Tumakuru, Karnataka.'}
            </p>
          </section>

        </div>

        {/* Footer Navigation */}
        <div className="mt-8 border-t border-gray-200 pt-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <Link href="/privacy" className="text-[#AC3D47] font-bold hover:underline">
            ← {lang === 'kn' ? 'ಗೌಪ್ಯತಾ ನೀತಿ (Privacy Policy)' : 'Privacy Policy'}
          </Link>
          <Link href="/faq" className="text-[#AC3D47] font-bold hover:underline">
            {lang === 'kn' ? 'ಸಾಮಾನ್ಯ ಪ್ರಶ್ನೆಗಳು (FAQ) →' : 'Frequently Asked Questions (FAQ) →'}
          </Link>
        </div>

      </div>
    </div>
  );
}
