'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageToggle';
import { PRIVACY_VERSION } from '@/lib/constants';

export default function AcceptTermsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) {
      setError(
        lang === 'kn'
          ? 'ದಯವಿಟ್ಟು ಮುಂದುವರಿಯಲು ನಿಯಮಗಳು ಮತ್ತು ಗೌಪ್ಯತಾ ನೀತಿಯನ್ನು ಒಪ್ಪಿಕೊಳ್ಳಿ.'
          : 'Please accept the updated Privacy Policy and Terms of Use to proceed.'
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error?.message || 'Failed to update consent. Please try again.');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setLoading(false);
      setError('Network error. Please check your connection and try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="gov-card p-6 border-gray-300">
        <div className="border-b border-gray-200 pb-4 mb-4">
          <div className="text-xs font-bold uppercase tracking-widest text-gray-500">
            Siddaganga Institute of Technology
          </div>
          <h1 className="text-xl font-bold text-[#AC3D47] mt-1">
            {lang === 'kn' ? 'ಗೌಪ್ಯತಾ ನೀತಿ ಮತ್ತು ನಿಯಮಗಳ ನವೀಕರಣ' : 'Privacy Policy & Terms Update'}
          </h1>
          <div className="text-xs font-medium text-gray-600 mt-1">
            Version: <span className="font-mono font-bold text-gray-900">{PRIVACY_VERSION}</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-300 p-3 text-xs text-red-700 font-medium" role="alert">
            {error}
          </div>
        )}

        <div className="text-xs text-gray-700 space-y-3 leading-relaxed mb-6">
          <p>
            {lang === 'kn'
              ? 'ಡಿಜಿಟಲ್ ವೈಯಕ್ತಿಕ ಡೇಟಾ ಸಂರಕ್ಷಣಾ ಕಾಯ್ದೆ, 2023 (DPDP Act 2023) ರ ಅನುಸಾರವಾಗಿ ನಮ್ಮ ಗೌಪ್ಯತಾ ನೀತಿ ಮತ್ತು ಬಳಕೆಯ ನಿಯಮಗಳನ್ನು ನವೀಕರಿಸಲಾಗಿದೆ. ನಿಮ್ಮ ಶೈಕ್ಷಣಿಕ, ಆದಾಯ, ಮತ್ತು ಬ್ಯಾಂಕಿಂಗ್ ವಿವರಗಳನ್ನು ಕೇವಲ ಕಾಲೇಜು ವಿದ್ಯಾರ್ಥಿವೇತನ ಸಮಿತಿಯ ಮೌಲ್ಯಮಾಪನಕ್ಕಾಗಿ ಮಾತ್ರ ಸುರಕ್ಷಿತವಾಗಿ ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲಾಗುತ್ತದೆ.'
              : 'Our Privacy Policy and Terms of Use have been updated in accordance with the Digital Personal Data Protection Act, 2023 (DPDP Act 2023). Your personal, academic, income, and banking details are processed strictly for scholarship verification, scrutiny, and disbursement by the College Scholarship Scrutiny Committee.'}
          </p>
          <p>
            {lang === 'kn'
              ? 'ದಯವಿಟ್ಟು ಕೆಳಗಿನ ಅಧಿಕೃತ ದಾಖಲೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ:'
              : 'Please review the updated institutional policies before proceeding:'}
          </p>

          <div className="border border-gray-200 bg-gray-50 p-3 space-y-1.5 text-xs">
            <div>
              •{' '}
              <Link href="/privacy" target="_blank" className="text-[#AC3D47] font-bold underline hover:text-[#8D323A]">
                {lang === 'kn' ? 'ಡಿಪಿಡಿಪಿ ಗೌಪ್ಯತಾ ನೀತಿ (Privacy Policy) ↗' : 'DPDP Privacy Policy ↗'}
              </Link>
            </div>
            <div>
              •{' '}
              <Link href="/terms" target="_blank" className="text-[#AC3D47] font-bold underline hover:text-[#8D323A]">
                {lang === 'kn' ? 'ಪೋರ್ಟಲ್ ಬಳಕೆಯ ನಿಯಮಗಳು (Terms of Use) ↗' : 'Portal Terms of Use ↗'}
              </Link>
            </div>
          </div>
        </div>

        <form onSubmit={handleAccept} className="space-y-4">
          <div className="border border-gray-300 bg-white p-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded-none border-gray-400 text-[#AC3D47] focus:ring-[#AC3D47]"
              />
              <span className="text-xs text-gray-800 font-medium leading-relaxed">
                {lang === 'kn'
                  ? 'ನಾನು ನವೀಕರಿಸಿದ ಗೌಪ್ಯತಾ ನೀತಿ ಮತ್ತು ಬಳಕೆಯ ನಿಯಮಗಳನ್ನು ಓದಿದ್ದೇನೆ ಮತ್ತು ನನ್ನ ವಿದ್ಯಾರ್ಥಿವೇತನ ಅರ್ಜಿಯ ಪ್ರಕ್ರಿಯೆಗೆ ಸಮ್ಮತಿಸುತ್ತೇನೆ.'
                  : 'I have read and agree to the updated Privacy Policy and Terms of Use under the DPDP Act 2023, and consent to the processing of my data for scholarship administration.'}
              </span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              type="submit"
              disabled={loading || !accepted}
              className="gov-btn gov-btn-primary flex-1 text-sm font-bold min-h-[44px] disabled:opacity-50"
            >
              {loading
                ? (lang === 'kn' ? 'ಉಳಿಸಲಾಗುತ್ತಿದೆ...' : 'Recording Consent...')
                : (lang === 'kn' ? 'ಒಪ್ಪಿಕೊಳ್ಳಿ ಮತ್ತು ಮುಂದುವರಿಯಿರಿ' : 'Accept & Continue')}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="gov-btn border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 text-xs font-semibold px-4 py-2"
            >
              {lang === 'kn' ? 'ಲಾಗ್ ಔಟ್' : 'Decline & Log Out'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
