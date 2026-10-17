'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageToggle';

export default function PrivacyPage() {
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
            {lang === 'kn' ? 'ಗೌಪ್ಯತಾ ನೀತಿ (ಡಿಪಿಡಿಪಿ ಕಾಯ್ದೆ 2023)' : 'Privacy Policy (DPDP Act 2023)'}
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            {lang === 'kn'
              ? 'ಡಿಜಿಟಲ್ ವೈಯಕ್ತಿಕ ಡೇಟಾ ಸಂರಕ್ಷಣಾ ಕಾಯ್ದೆ, 2023 ರ ಅಡಿಯಲ್ಲಿ ಅಧಿಕೃತ ಪ್ರಕಟಣೆ | ಆವೃತ್ತಿ: 2026-1'
              : 'Official Notice under the Digital Personal Data Protection Act, 2023 | Version: 2026-1'}
          </p>
          {lang === 'kn' && (
            <div className="mt-2 inline-block bg-amber-50 border border-amber-300 px-2 py-0.5 text-[11px] font-mono text-amber-800">
              TODO: review by college (ಕಾಲೇಜು ಆಡಳಿತ ಮಂಡಳಿಯಿಂದ ಕನ್ನಡ ಪರಿಶೀಲನೆ ಬಾಕಿ ಇದೆ)
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="space-y-6 text-xs text-gray-800 leading-relaxed">

          {/* Section 1: Introduction */}
          <section>
            <h2 className="text-sm font-bold text-[#AC3D47] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
              1. {lang === 'kn' ? 'ಪೀಠಿಕೆ ಮತ್ತು ಉದ್ದೇಶ' : 'Introduction & Statutory Purpose'}
            </h2>
            <p>
              {lang === 'kn'
                ? 'ಸಿದ್ಧಗಂಗಾ ತಾಂತ್ರಿಕ ಮಹಾವಿದ್ಯಾಲಯ (ಎಸ್.ಐ.ಟಿ), ತುಮಕೂರು, ವಿದ್ಯಾರ್ಥಿಗಳ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯ ಸುರಕ್ಷತೆಗೆ ಬದ್ಧವಾಗಿದೆ. ಈ ಪೋರ್ಟಲ್ ಅನ್ನು ಡಾ. ಎಂ.ಎನ್. ಚನ್ನಬಸಪ್ಪ ಎಂಡೋಮೆಂಟ್ ಫಂಡ್, ಶ್ರೀ ಶ್ರೀಪತಿ ಕೆ.ಎ. ಸ್ಮಾರಕ ವಿದ್ಯಾರ್ಥಿವೇತನ ಮತ್ತು ಕಾಲೇಜಿನ ಇತರೆ ಆರ್ಥಿಕ ನೆರವು ಯೋಜನೆಗಳ ಪರಿಶೀಲನೆಗಾಗಿ ಮಾತ್ರ ಬಳಸಲಾಗುತ್ತದೆ. ಯಾವುದೇ ವಾಣಿಜ್ಯ ಅಥವಾ ಬಾಹ್ಯ ಉದ್ದೇಶಗಳಿಗಾಗಿ ಡೇಟಾವನ್ನು ಬಳಸಲಾಗುವುದಿಲ್ಲ.'
                : 'Siddaganga Institute of Technology (SIT), Tumakuru, is committed to safeguarding the privacy and security of student information in compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act 2023). This portal processes personal data exclusively for institutional scholarship processing, scrutiny, merit evaluation, and disbursement for the Dr. M.N. Channabasappa Endowment Fund, Sri Sripathi K A Memorial Scheme, and related college financial aid.'}
            </p>
          </section>

          {/* Section 2: Data Collected */}
          <section>
            <h2 className="text-sm font-bold text-[#AC3D47] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
              2. {lang === 'kn' ? 'ಸಂಗ್ರಹಿಸಲಾಗುವ ಡೇಟಾದ ವಿವರಗಳು' : 'Categories of Personal Data Collected'}
            </h2>
            <p className="mb-2">
              {lang === 'kn'
                ? 'ವಿದ್ಯಾರ್ಥಿವೇತನ ಅರ್ಹತೆ ಮತ್ತು ಮೆರಿಟ್ ಮೌಲ್ಯಮಾಪನಕ್ಕಾಗಿ ಈ ಕೆಳಗಿನ ಮಾಹಿತಿಯನ್ನು ಕಡ್ಡಾಯವಾಗಿ ಸಂಗ್ರಹಿಸಲಾಗುತ್ತದೆ:'
                : 'To evaluate eligibility and calculate merit rankings, the portal collects the following categories of data:'}
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-gray-700">
              <li>
                <strong>{lang === 'kn' ? 'ವೈಯಕ್ತಿಕ ಗುರುತು: ' : 'Personal Identification: '}</strong>
                {lang === 'kn'
                  ? 'ಪೂರ್ಣ ಹೆಸರು, ಜನ್ಮ ದಿನಾಂಕ (DOB), ಲಿಂಗ, ರಾಷ್ಟ್ರೀಯತೆ, ಯು.ಎಸ್.ಎನ್ (USN), ಮತ್ತು ತಂದೆ/ಪೋಷಕರ ಹೆಸರು.'
                  : 'Full name (as per official college records), Date of birth, Gender, Nationality, SIT University Seat Number (USN), and Father/Guardian name.'}
              </li>
              <li>
                <strong>{lang === 'kn' ? 'ಸಂಪರ್ಕ ವಿವರಗಳು: ' : 'Contact Details: '}</strong>
                {lang === 'kn'
                  ? 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ, ಅಧಿಕೃತ ಇಮೇಲ್ ವಿಳಾಸ, ಅಂಚೆ ವಿಳಾಸ ಮತ್ತು ಪಿನ್ ಕೋಡ್.'
                  : 'Student mobile number, official SIT email address, permanent residential postal address, and PIN code.'}
              </li>
              <li>
                <strong>{lang === 'kn' ? 'ಶೈಕ್ಷಣಿಕ ವಿವರಗಳು: ' : 'Academic Records: '}</strong>
                {lang === 'kn'
                  ? 'ಸಿಇಟಿ ಹಂಚಿಕೆ ಆದೇಶ ಪ್ರತಿ, ಕೊನೆಯ ಪರೀಕ್ಷೆಯ ಅಂಕಗಳು, ಒಟ್ಟು ಅಂಕಗಳು, ಶೇಕಡಾವಾರು, ಸಿಜಿಪಿಎ, ತರಗತಿಯ ವರ್ಷ, ಸೆಮಿಸ್ಟರ್ ಮತ್ತು ಎಂಜಿನಿಯರಿಂಗ್ ವಿಭಾಗ.'
                  : 'CET admission order, qualifying examination marks card, gross total marks, percentage, CGPA (for 2nd-4th year), semester, course, and engineering branch.'}
              </li>
              <li>
                <strong>{lang === 'kn' ? 'ಆರ್ಥಿಕ ಮತ್ತು ಆದಾಯ ವಿವರಗಳು: ' : 'Financial & Family Income: '}</strong>
                {lang === 'kn'
                  ? 'ಪೋಷಕರ ವೃತ್ತಿ, ಕುಟುಂಬದ ವಾರ್ಷಿಕ ಆದಾಯ, ಕಂದಾಯ ಇಲಾಖೆ ನೀಡಿದ ಅಧಿಕೃತ ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ ಮತ್ತು ಚಾಲ್ತಿ ಸಾಲಿನ ಶುಲ್ಕ ಪಾವತಿ ರಸೀದಿ.'
                  : 'Parent/guardian occupation, annual family income, official revenue department income certificate, and current academic year college fee receipt.'}
              </li>
              <li>
                <strong>{lang === 'kn' ? 'ಬ್ಯಾಂಕ್ ವಿವರಗಳು: ' : 'Banking Credentials: '}</strong>
                {lang === 'kn'
                  ? 'ವಿದ್ಯಾರ್ಥಿಯ ಉಳಿತಾಯ ಬ್ಯಾಂಕ್ ಖಾತೆ ಸಂಖ್ಯೆ, ಖಾತೆದಾರರ ಹೆಸರು, ಐಎಫ್‌ಎಸ್‌ಸಿ (IFSC) ಕೋಡ್, ಬ್ಯಾಂಕ್ ಹೆಸರು ಮತ್ತು ಶಾಖೆಯ ವಿಳಾಸ. (ಬ್ಯಾಂಕ್ ಖಾತೆ ಸಂಖ್ಯೆಯನ್ನು ಸರ್ವರ್‌ನಲ್ಲಿ AES-256-GCM ಮೂಲಕ ಎನ್‌ಕ್ರಿಪ್ಟ್ ಮಾಡಲಾಗುತ್ತದೆ).'
                  : "Student's personal savings bank account number, account holder name, IFSC code, bank name, and branch. Bank account numbers are strongly encrypted at rest using AES-256-GCM authenticated encryption."}
              </li>
              <li>
                <strong>{lang === 'kn' ? 'ಡಿಜಿಟಲ್ ಛಾಯಾಚಿತ್ರ ಮತ್ತು ಸಹಿಗಳು: ' : 'Photographs & Digital Signatures: '}</strong>
                {lang === 'kn'
                  ? 'ವಿದ್ಯಾರ್ಥಿಯ ಪಾಸ್‌ಪೋರ್ಟ್ ಭಾವಚಿತ್ರ, ವಿದ್ಯಾರ್ಥಿಯ ಡಿಜಿಟಲ್ ಸಹಿ, ಮತ್ತು ಪೋಷಕರ ಸಹಿ.'
                  : 'Recent passport photograph, student digital signature, and parent/guardian digital signature.'}
              </li>
            </ul>

            {/* Crucial Aadhaar notice */}
            <div className="mt-3 border border-[#AC3D47] bg-red-50 p-3 text-gray-800">
              <strong className="text-[#AC3D47]">
                {lang === 'kn' ? 'ಆಧಾರ್ ಪ್ರತಿಯ ನಿರ್ವಹಣೆ ಕುರಿತು ಸ್ಪಷ್ಟನೆ: ' : 'Important Notice Regarding Aadhaar Copies: '}
              </strong>
              {lang === 'kn'
                ? 'ವಿದ್ಯಾರ್ಥಿಯ ಆಧಾರ್ ಪ್ರತಿಯನ್ನು ಕೇವಲ ಗುರುತಿನ ಪರಿಶೀಲನಾ ದಾಖಲೆಯ ಚಿತ್ರವಾಗಿ (Image/PDF) ಮಾತ್ರ ಅಪ್‌ಲೋಡ್ ಮಾಡಿಕೊಳ್ಳಲಾಗುತ್ತದೆ. ಯಾವುದೇ ಸಂದರ್ಭದಲ್ಲೂ ಆಧಾರ್ ಸಂಖ್ಯೆಯನ್ನು ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಪಠ್ಯವಾಗಿ (Text) ಸಂಗ್ರಹಿಸುವುದಿಲ್ಲ ಅಥವಾ ಸೂಚ್ಯಂಕಗೊಳಿಸುವುದಿಲ್ಲ.'
                : 'Aadhaar copies are uploaded strictly as scanned document images for physical scrutiny and identity verification. The Aadhaar number is NOT extracted, indexed, or stored as text anywhere in our database, and is never logged in server logs.'}
            </div>
          </section>

          {/* Section 3: Data Access & Sharing */}
          <section>
            <h2 className="text-sm font-bold text-[#AC3D47] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
              3. {lang === 'kn' ? 'ಡೇಟಾ ಪ್ರವೇಶ ಮತ್ತು ಗೋಚರತೆ' : 'Data Visibility & Authorized Access'}
            </h2>
            <p className="mb-2">
              {lang === 'kn'
                ? 'ನಿಮ್ಮ ಅರ್ಜಿಯ ವಿವರಗಳನ್ನು ಯಾರು ವೀಕ್ಷಿಸಬಹುದು:'
                : 'Access to applicant data is strictly restricted via role-based access control (RBAC):'}
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-gray-700">
              <li>
                <strong>{lang === 'kn' ? 'ಅರ್ಜಿದಾರ ವಿದ್ಯಾರ್ಥಿ: ' : 'The Student Applicant: '}</strong>
                {lang === 'kn'
                  ? 'ತನ್ನ ಸ್ವಂತ ಪ್ರೊಫೈಲ್ ಮತ್ತು ಸಲ್ಲಿಸಿದ ಅರ್ಜಿಯ ವಿವರಗಳು ಮತ್ತು ಸ್ಥಿತಿಯನ್ನು ಮಾತ್ರ ವೀಕ್ಷಿಸಬಹುದು.'
                  : 'May view and manage only their own submitted applications and verification timeline.'}
              </li>
              <li>
                <strong>{lang === 'kn' ? 'ವಿದ್ಯಾರ್ಥಿವೇತನ ಸಮಿತಿ ಸಿಬ್ಬಂದಿ: ' : 'Scholarship Scrutiny Committee & Reviewers: '}</strong>
                {lang === 'kn'
                  ? 'ಕಾಲೇಜಿನ ಅಧಿಕೃತ ಪರಿಶೀಲನಾಧಿಕಾರಿಗಳು ಮತ್ತು ಆಡಳಿತಾಧಿಕಾರಿಗಳು ಮಾತ್ರ ಅರ್ಹತೆ ಪರಿಶೀಲನೆಗಾಗಿ ಅರ್ಜಿಯನ್ನು ಪರಿಶೀಲಿಸುತ್ತಾರೆ.'
                  : 'Designated department reviewers and institutional administrators verify certificates and merit rankings.'}
              </li>
              <li>
                <strong>{lang === 'kn' ? 'ಬಾಹ್ಯ ಹಂಚಿಕೆ ನಿಷೇಧ: ' : 'No External Commercial Disclosure: '}</strong>
                {lang === 'kn'
                  ? 'ಡೇಟಾವನ್ನು ಯಾವುದೇ ಮೂರನೇ ವ್ಯಕ್ತಿಗೆ ಅಥವಾ ವಾಣಿಜ್ಯ ಸಂಸ್ಥೆಗೆ ಮಾರಾಟ ಮಾಡುವುದಿಲ್ಲ ಅಥವಾ ಹಂಚಿಕೊಳ್ಳುವುದಿಲ್ಲ.'
                  : 'Personal data is never sold, leased, or disclosed to third parties or commercial entities.'}
              </li>
            </ul>
          </section>

          {/* Section 4: Data Storage and Infrastructure */}
          <section>
            <h2 className="text-sm font-bold text-[#AC3D47] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
              4. {lang === 'kn' ? 'ಡೇಟಾ ಸಂಗ್ರಹಣೆ ಸ್ಥಳ ಮತ್ತು ಮೂಲಸೌಕರ್ಯ' : 'Data Storage Location & Hosting Infrastructure'}
            </h2>
            <p>
              {lang === 'kn'
                ? 'ಎಲ್ಲಾ ದತ್ತಾಂಶ ಮತ್ತು ದಾಖಲೆಗಳನ್ನು ಭಾರತದ ಮುಂಬೈ ನಗರದಲ್ಲಿರುವ (ap-south-1 ಪ್ರದೇಶ) Supabase ಎಂಟರ್‌ಪ್ರೈಸ್ ಮೂಲಸೌಕರ್ಯದಲ್ಲಿ ಸಂಗ್ರಹಿಸಲಾಗುತ್ತದೆ. ವೆಬ್ ಅಪ್ಲಿಕೇಶನ್ ಅನ್ನು Vercel ಕ್ಲೌಡ್ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್‌ನಲ್ಲಿ ಸುರಕ್ಷಿತ HTTPS ಪ್ರೋಟೋಕಾಲ್‌ನೊಂದಿಗೆ ಹೋಸ್ಟ್ ಮಾಡಲಾಗಿದೆ. ಡೇಟಾವನ್ನು ಭಾರತದ ಭೌಗೋಳಿಕ ಗಡಿಯೊಳಗೇ ರಕ್ಷಿಸಲಾಗಿದೆ.'
                : 'All database records and encrypted file attachments are stored within the sovereign territory of India at the Supabase data center in the Mumbai region (ap-south-1). The web application is served through Vercel over mandatory TLS 1.3 encrypted HTTPS. Data sovereignty and local storage requirements under Indian law are strictly maintained.'}
            </p>
          </section>

          {/* Section 5: Retention Policy */}
          <section>
            <h2 className="text-sm font-bold text-[#AC3D47] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
              5. {lang === 'kn' ? 'ಡೇಟಾ ಉಳಿಸಿಕೊಳ್ಳುವಿಕೆ ಅವಧಿ' : 'Data Retention Period'}
            </h2>
            <p className="bg-gray-50 border border-gray-300 p-3">
              <span className="font-bold text-[#AC3D47]">
                {/* TODO [COLLEGE DECISION REQUIRED]: College Governing Council must confirm the exact retention period */}
                TODO [COLLEGE DECISION REQUIRED]:
              </span>{' '}
              {lang === 'kn'
                ? 'ವಿದ್ಯಾರ್ಥಿವೇತನ ಅರ್ಜಿಗಳು ಮತ್ತು ಸಂಬಂಧಿತ ಪ್ರಮಾಣಪತ್ರ ದಾಖಲೆಗಳನ್ನು ಆಡಿಟ್ ಮತ್ತು ಕಾಲೇಜು ಶೈಕ್ಷಣಿಕ ನಿಯಮಾವಳಿಗಳಿಗೆ ಅನುಗುಣವಾಗಿ [ಕಾಲೇಜು ನಿರ್ಧಾರ ಬಾಕಿ ಇದೆ - ಶಿಫಾರಸು: ಪದವಿ ಮುಗಿದ ನಂತರ 5 ವರ್ಷಗಳು] ಅವಧಿಯವರೆಗೆ ಸಂರಕ್ಷಿಸಲಾಗುತ್ತದೆ. ಅವಧಿ ಮುಗಿದ ನಂತರ ವೈಯಕ್ತಿಕ ಡೇಟಾ ಮತ್ತು ಫೈಲ್‌ಗಳನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ಅಳಿಸಲಾಗುತ್ತದೆ.'
                : 'Application data, merit calculations, and supporting certificates are retained for the duration prescribed by institutional audit standards [COLLEGE DECISION REQUIRED: Specify retention period, e.g., 5 years following cycle completion or student graduation]. Following this period, personal records and uploaded files are purged in accordance with our institutional disposal schedule.'}
            </p>
          </section>

          {/* Section 6: Student Rights under DPDP */}
          <section>
            <h2 className="text-sm font-bold text-[#AC3D47] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
              6. {lang === 'kn' ? 'ವಿದ್ಯಾರ್ಥಿಯ ಹಕ್ಕುಗಳು (ಡಿಪಿಡಿಪಿ ಕಾಯ್ದೆ 2023)' : "Student Rights (Data Principal Rights)"}
            </h2>
            <p className="mb-2">
              {lang === 'kn'
                ? 'ಡಿಪಿಡಿಪಿ ಕಾಯ್ದೆ 2023 ರ ಅಡಿಯಲ್ಲಿ, ಡೇಟಾ ಪ್ರಿನ್ಸಿಪಾಲ್ ಆಗಿ ವಿದ್ಯಾರ್ಥಿಗಳು ಕೆಳಗಿನ ಶಾಸನಬದ್ಧ ಹಕ್ಕುಗಳನ್ನು ಹೊಂದಿರುತ್ತಾರೆ:'
                : 'Under the DPDP Act 2023, applicant students (Data Principals) possess the following rights regarding their personal data:'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border border-gray-300 p-3 bg-white">
                <div className="font-bold text-[#AC3D47] mb-1">
                  {lang === 'kn' ? '1. ಪ್ರವೇಶದ ಹಕ್ಕು (Right to Access)' : '1. Right to Access'}
                </div>
                <div>
                  {lang === 'kn'
                    ? 'ನಿಮ್ಮ ಖಾತೆಯ ಮೂಲಕ ನೀವು ಸಲ್ಲಿಸಿದ ಎಲ್ಲಾ ಮಾಹಿತಿ ಮತ್ತು ಅರ್ಜಿಯ ಸ್ಥಿತಿಯನ್ನು ವೀಕ್ಷಿಸಬಹುದು.'
                    : 'The right to obtain a summary of personal data being processed and the processing activities.'}
                </div>
              </div>

              <div className="border border-gray-300 p-3 bg-white">
                <div className="font-bold text-[#AC3D47] mb-1">
                  {lang === 'kn' ? '2. ತಿದ್ದುಪಡಿಯ ಹಕ್ಕು (Right to Correction)' : '2. Right to Correction'}
                </div>
                <div>
                  {lang === 'kn'
                    ? 'ತಪ್ಪಾದ ಅಥವಾ ಅಪೂರ್ಣ ವಿವರಗಳನ್ನು ತಿದ್ದುಪಡಿ ಮಾಡಲು ವಿದ್ಯಾರ್ಥಿವೇತನ ಸೆಲ್ ಅನ್ನು ಸಂಪರ್ಕಿಸಬಹುದು.'
                    : 'The right to request correction, completion, and updating of misleading or inaccurate personal data.'}
                </div>
              </div>

              <div className="border border-gray-300 p-3 bg-white">
                <div className="font-bold text-[#AC3D47] mb-1">
                  {lang === 'kn' ? '3. ಅಳಿಸುವಿಕೆಯ ಹಕ್ಕು (Right to Erasure)' : '3. Right to Erasure / Deletion'}
                </div>
                <div>
                  {lang === 'kn'
                    ? 'ಶಾಸನಬದ್ಧ ಲೆಕ್ಕಪರಿಶೋಧನೆ ಮತ್ತು ಆಡಿಟ್ ಬಾಧ್ಯತೆಗಳಿಗೆ ಒಳಪಟ್ಟು, ನಿಮ್ಮ ಖಾತೆ ಮತ್ತು ಡೇಟಾ ಅಳಿಸಲು ವಿನಂತಿಸಬಹುದು.'
                    : 'The right to request deletion of personal data when no longer necessary for scholarship processing, subject to statutory audit laws.'}
                </div>
              </div>

              <div className="border border-gray-300 p-3 bg-white">
                <div className="font-bold text-[#AC3D47] mb-1">
                  {lang === 'kn' ? '4. ಕುಂದುಕೊರತೆ ನಿವಾರಣೆ (Grievance Redressal)' : '4. Right to Grievance Redressal'}
                </div>
                <div>
                  {lang === 'kn'
                    ? 'ಡೇಟಾ ನಿರ್ವಹಣೆ ಕುರಿತು ಕಾಲೇಜು ನೇಮಿಸಿದ ನೋಡಲ್ ಅಧಿಕಾರಿಗೆ ನೇರವಾಗಿ ದೂರು ಸಲ್ಲಿಸಬಹುದು.'
                    : 'The right to readily accessible grievance redressal mechanisms regarding personal data handling.'}
                </div>
              </div>
            </div>
          </section>

          {/* Section 7: Grievance Officer */}
          <section>
            <h2 className="text-sm font-bold text-[#AC3D47] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
              7. {lang === 'kn' ? 'ಕುಂದುಕೊರತೆ ನಿವಾರಣಾ ಸಂಪರ್ಕ' : 'Data Protection Grievance Officer'}
            </h2>
            <div className="border border-gray-300 p-4 bg-gray-50 leading-relaxed">
              <p className="mb-2">
                {lang === 'kn'
                  ? 'ಡೇಟಾ ಸಂರಕ್ಷಣೆ ಮತ್ತು ಗೌಪ್ಯತೆಗೆ ಸಂಬಂಧಿಸಿದ ಯಾವುದೇ ಪ್ರಶ್ನೆಗಳು ಅಥವಾ ದೂರುಗಳಿದ್ದಲ್ಲಿ ಈ ಕೆಳಗಿನ ಅಧಿಕಾರಿಯನ್ನು ಸಂಪರ್ಕಿಸಿ:'
                  : 'For grievances or inquiries regarding your personal data and DPDP compliance, please contact our institutional officer:'}
              </p>
              <div className="font-mono text-xs space-y-1">
                <div>
                  <span className="font-bold text-gray-700">Officer Name: </span>
                  <span className="text-[#AC3D47] font-bold">
                    {/* TODO [COLLEGE DECISION REQUIRED]: Designate Data Protection Grievance Officer */}
                    TODO [COLLEGE DECISION REQUIRED]: Designate Officer Name (e.g. Dr. Registrar / Dean)
                  </span>
                </div>
                <div>
                  <span className="font-bold text-gray-700">Designation: </span>
                  <span>Data Protection Officer & Nodal Officer (Scholarships)</span>
                </div>
                <div>
                  <span className="font-bold text-gray-700">Email: </span>
                  <span className="text-[#AC3D47]">
                    {/* TODO [COLLEGE DECISION REQUIRED]: Official DPDP Grievance email */}
                    TODO [COLLEGE DECISION REQUIRED]: grievance-dpdp@sit.ac.in
                  </span>
                </div>
                <div>
                  <span className="font-bold text-gray-700">Address: </span>
                  <span>Administrative Block, Siddaganga Institute of Technology, B.H. Road, Tumakuru – 572103, Karnataka</span>
                </div>
                <div>
                  <span className="font-bold text-gray-700">Phone: </span>
                  <span>0816-2214000 / 0816-2214002</span>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Footer Navigation */}
        <div className="mt-8 border-t border-gray-200 pt-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <Link href="/terms" className="text-[#AC3D47] font-bold hover:underline">
            ← {lang === 'kn' ? 'ಬಳಕೆಯ ನಿಯಮಗಳು (Terms of Use)' : 'Terms of Use'}
          </Link>
          <Link href="/register" className="gov-btn gov-btn-primary px-4 py-2 font-bold">
            {lang === 'kn' ? 'ನೋಂದಣಿಗೆ ಹಿಂತಿರುಗಿ' : 'Back to Registration'}
          </Link>
        </div>

      </div>
    </div>
  );
}
