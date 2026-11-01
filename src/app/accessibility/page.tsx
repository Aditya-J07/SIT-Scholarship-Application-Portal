'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageToggle';

export default function AccessibilityPage() {
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
            {lang === 'kn' ? 'ಡಿಜಿಟಲ್ ಪ್ರವೇಶಸಾಧ್ಯತೆ ಹೇಳಿಕೆ' : 'Digital Accessibility Statement'}
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            {lang === 'kn'
              ? 'ಡಬ್ಲ್ಯೂಸಿಎಜಿ 2.1 ಎಎ (WCAG 2.1 AA) ಮಾನದಂಡಗಳ ಅಡಿಯಲ್ಲಿ ಎಲ್ಲರಿಗೂ ಸಮಾನ ಡಿಜಿಟಲ್ ಪ್ರವೇಶದ ಬದ್ಧತೆ'
              : 'Institutional Commitment to Digital Accessibility & WCAG 2.1 Level AA Conformance'}
          </p>
          {lang === 'kn' && (
            <div className="mt-2 inline-block bg-amber-50 border border-amber-300 px-2 py-0.5 text-[11px] font-mono text-amber-800">
              TODO: review by college (ಕಾಲೇಜು ಆಡಳಿತ ಮಂಡಳಿಯಿಂದ ಕನ್ನಡ ಪರಿಶೀಲನೆ ಬಾಕಿ ಇದೆ)
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="space-y-6 text-xs text-gray-800 leading-relaxed">

          {/* Section 1: Commitment */}
          <section>
            <h2 className="text-sm font-bold text-[#AC3D47] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
              1. {lang === 'kn' ? 'ನಮ್ಮ ಬದ್ಧತೆ' : 'Institutional Commitment'}
            </h2>
            <p>
              {lang === 'kn'
                ? 'ಸಿದ್ಧಗಂಗಾ ತಾಂತ್ರಿಕ ಮಹಾವಿದ್ಯಾಲಯವು (ಎಸ್.ಐ.ಟಿ) ವಿಶೇಷ ಚೇತನರು ಸೇರಿದಂತೆ ಎಲ್ಲಾ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ತನ್ನ ಡಿಜಿಟಲ್ ಸೇವೆಗಳನ್ನು ಸಮಾನವಾಗಿ ತಲುಪಿಸಲು ಬದ್ಧವಾಗಿದೆ. ಈ ಪೋರ್ಟಲ್ ಅನ್ನು ವೆಬ್ ಕಂಟೆಂಟ್ ಪ್ರವೇಶಸಾಧ್ಯತಾ ಮಾರ್ಗಸೂಚಿಗಳು (WCAG 2.1 AA) ಮತ್ತು ಭಾರತ ಸರ್ಕಾರದ ಡಿಜಿಟಲ್ ಪ್ರವೇಶ ಮಾನದಂಡಗಳಿಗೆ ಅನುಗುಣವಾಗಿ ವಿನ್ಯಾಸಗೊಳಿಸಲಾಗಿದೆ.'
                : 'Siddaganga Institute of Technology is dedicated to ensuring that our digital portal and online scholarship services are accessible to all students, including those with visual, auditory, cognitive, or motor impairments. We strive to adhere to the Web Content Accessibility Guidelines (WCAG 2.1 Level AA) and the Guidelines for Indian Government Websites (GIGW).'}
            </p>
          </section>

          {/* Section 2: Features implemented */}
          <section>
            <h2 className="text-sm font-bold text-[#AC3D47] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
              2. {lang === 'kn' ? 'ಪೋರ್ಟಲ್‌ನಲ್ಲಿರುವ ಪ್ರಮುಖ ಸೌಲಭ್ಯಗಳು' : 'Accessibility Features Implemented'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border border-gray-300 p-3 bg-white">
                <div className="font-bold text-[#AC3D47] mb-1">
                  {lang === 'kn' ? 'ಕೀಬೋರ್ಡ್ ನ್ಯಾವಿಗೇಶನ್' : 'Full Keyboard Navigability'}
                </div>
                <div>
                  {lang === 'kn'
                    ? 'ಎಲ್ಲಾ ಫಾರ್ಮ್‌ಗಳು, ಬಟನ್‌ಗಳು, ಮತ್ತು ಲಿಂಕ್‌ಗಳನ್ನು ಕೀಬೋರ್ಡ್ (Tab/Enter/Space) ಮೂಲಕವೇ ಸುಲಭವಾಗಿ ನಿರ್ವಹಿಸಬಹುದು.'
                    : 'Every interactive element, input field, and navigation control can be operated using a keyboard alone without mouse dependency.'}
                </div>
              </div>

              <div className="border border-gray-300 p-3 bg-white">
                <div className="font-bold text-[#AC3D47] mb-1">
                  {lang === 'kn' ? 'ಹೆಚ್ಚಿನ ಕಾಂಟ್ರಾಸ್ಟ್ ಮತ್ತು ದೃಶ್ಯ ಸ್ಪಷ್ಟತೆ' : 'High Contrast & Clear Typography'}
                </div>
                <div>
                  {lang === 'kn'
                    ? 'ಶುದ್ಧ ಬಿಳಿ ಹಿನ್ನೆಲೆ ಮತ್ತು ಗಾಢ ನೌಕಾ/ಕೆಂಪು ಬಣ್ಣದೊಂದಿಗೆ ಪಠ್ಯವು ಓದಲು ಅತ್ಯಂತ ಸುಲಭವಾಗಿದೆ.'
                    : 'High contrast text ratios (minimum 4.5:1 for normal text) ensure clear readability across various screens and lighting.'}
                </div>
              </div>

              <div className="border border-gray-300 p-3 bg-white">
                <div className="font-bold text-[#AC3D47] mb-1">
                  {lang === 'kn' ? 'ಸ್ಕ್ರೀನ್ ರೀಡರ್ ಹೊಂದಾಣಿಕೆ' : 'Screen Reader Optimization'}
                </div>
                <div>
                  {lang === 'kn'
                    ? 'ದೋಷ ಸಂದೇಶಗಳು ಮತ್ತು ಅಲರ್ಟ್‌ಗಳಿಗೆ ARIA ಲೈವ್ (aria-live) ಮತ್ತು ಸ್ಪಷ್ಟ ಲೇಬಲ್‌ಗಳನ್ನು ಒದಗಿಸಲಾಗಿದೆ.'
                    : 'Semantic HTML5 structure with comprehensive ARIA labels and live regions ensures screen readers announce errors and status updates instantly.'}
                </div>
              </div>

              <div className="border border-gray-300 p-3 bg-white">
                <div className="font-bold text-[#AC3D47] mb-1">
                  {lang === 'kn' ? 'ಬಣ್ಣದ ಮೇಲೆ ಮಾತ್ರ ಅವಲಂಬಿತವಾಗಿಲ್ಲ' : 'No Reliance on Color Alone'}
                </div>
                <div>
                  {lang === 'kn'
                    ? 'ಯಾವುದೇ ಸ್ಥಿತಿ ಅಥವಾ ದೋಷವನ್ನು ತಿಳಿಸಲು ಬಣ್ಣದ ಜೊತೆಗೆ ಸ್ಪಷ್ಟ ಪಠ್ಯ ಮತ್ತು ಚಿಹ್ನೆಗಳನ್ನು ಬಳಸಲಾಗಿದೆ.'
                    : 'Information and validation states are never conveyed through color alone; explicit text descriptions and icons accompany all feedback.'}
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Technical Specifications */}
          <section>
            <h2 className="text-sm font-bold text-[#AC3D47] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
              3. {lang === 'kn' ? 'ತಾಂತ್ರಿಕ ವಿವರಣೆಗಳು' : 'Technical Specifications'}
            </h2>
            <p>
              {lang === 'kn'
                ? 'ಈ ಪೋರ್ಟಲ್ ಅನ್ನು ಆಧುನಿಕ HTML5, WAI-ARIA, ಮತ್ತು CSS ತಂತ್ರಜ್ಞಾನಗಳನ್ನು ಬಳಸಿ ನಿರ್ಮಿಸಲಾಗಿದೆ. ಇದು NVDA, JAWS, VoiceOver, ಮತ್ತು TalkBack ನಂತಹ ಪ್ರಮುಖ ಸ್ಕ್ರೀನ್ ರೀಡರ್‌ಗಳೊಂದಿಗೆ ಹೊಂದಾಣಿಕೆಯಾಗುತ್ತದೆ.'
                : 'The SIT Scholarship Application Portal relies upon HTML5, WAI-ARIA, and modern CSS standards. It is tested for compatibility with assistive technologies including NVDA, JAWS, macOS VoiceOver, and Android TalkBack.'}
            </p>
          </section>

          {/* Section 4: Reporting Barriers */}
          <section>
            <h2 className="text-sm font-bold text-[#AC3D47] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
              4. {lang === 'kn' ? 'ಸಮಸ್ಯೆಗಳನ್ನು ವರದಿ ಮಾಡಲು ಸಂಪರ್ಕಿಸಿ' : 'Reporting Accessibility Barriers'}
            </h2>
            <div className="border border-gray-300 bg-gray-50 p-4 leading-relaxed font-mono text-xs">
              <p className="font-sans mb-2 text-gray-800">
                {lang === 'kn'
                  ? 'ಈ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಯಾವುದೇ ಪ್ರವೇಶಸಾಧ್ಯತೆಯ ಅಡೆತಡೆಗಳು ಎದುರಾದರೆ ದಯವಿಟ್ಟು ನಮಗೆ ತಿಳಿಸಿ:'
                  : 'If you encounter any difficulty accessing content or completing forms on this portal, please contact our accessibility coordinator:'}
              </p>
              <div>
                <span className="font-bold text-gray-700">Contact: </span>
                <span className="text-[#AC3D47] font-bold">
                  {/* TODO [COLLEGE DECISION REQUIRED]: Accessibility Contact Nodal Officer */}
                  TODO [COLLEGE DECISION REQUIRED]: Accessibility Coordinator (Dean / Scholarship Cell)
                </span>
              </div>
              <div>
                <span className="font-bold text-gray-700">Email: </span>
                <span className="text-[#AC3D47]">
                  TODO [COLLEGE DECISION REQUIRED]: TODO_ACCESSIBILITY_CONTACT
                </span>
              </div>
              <div>
                <span className="font-bold text-gray-700">Office: </span>
                <span>Scholarship Cell, Ground Floor, Administrative Block, SIT Tumakuru</span>
              </div>
              <div>
                <span className="font-bold text-gray-700">Telephone: </span>
                <span>0816-2214000</span>
              </div>
            </div>
          </section>

        </div>

        {/* Footer Navigation */}
        <div className="mt-8 border-t border-gray-200 pt-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <Link href="/faq" className="text-[#AC3D47] font-bold hover:underline">
            ← {lang === 'kn' ? 'ಸಾಮಾನ್ಯ ಪ್ರಶ್ನೆಗಳು (FAQ)' : 'FAQ'}
          </Link>
          <Link href="/privacy" className="text-[#AC3D47] font-bold hover:underline">
            {lang === 'kn' ? 'ಗೌಪ್ಯತಾ ನೀತಿ (Privacy Policy) →' : 'Privacy Policy →'}
          </Link>
        </div>

      </div>
    </div>
  );
}
