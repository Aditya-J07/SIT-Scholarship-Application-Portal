'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApplicationRecord } from '@/lib/types';
import { useLanguage } from '@/components/LanguageToggle';

export default function DashboardPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [session, setSession] = useState<{ userId: string; role: string; fullName: string; email: string; mobile: string } | null>(null);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push('/login');
          return;
        }
        setSession(data.user);
        loadApplications();
      })
      .catch(() => {
        router.push('/login');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadApplications = async () => {
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.applications) {
        setApplications(data.applications);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 font-bold uppercase text-[11px]">{t.status_accepted}</span>;
      case 'shortlisted':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.5 font-bold uppercase text-[11px]">{t.status_shortlisted}</span>;
      case 'needs_correction':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 font-bold uppercase text-[11px]">{t.status_needs_correction}</span>;
      case 'submitted':
        return <span className="bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 font-bold uppercase text-[11px]">{t.status_submitted}</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 font-bold uppercase text-[11px]">{t.status_rejected}</span>;
      case 'draft':
      default:
        return <span className="bg-gray-100 text-gray-800 border border-gray-300 px-2 py-0.5 font-bold uppercase text-[11px]">{t.status_draft}</span>;
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-center text-xs text-gray-600">
        {lang === 'kn' ? 'ವಿದ್ಯಾರ್ಥಿ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಲೋಡ್ ಆಗುತ್ತಿದೆ...' : 'Loading student dashboard...'}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Welcome Banner */}
      <div className="border border-gray-300 bg-white p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {t.college_full}
          </div>
          <h1 className="text-xl font-bold text-[#AC3D47]">
            {lang === 'kn' ? 'ಸ್ವಾಗತ' : 'Welcome'}, {session?.fullName}
          </h1>
          <div className="text-xs text-gray-600 mt-0.5">
            {lang === 'kn' ? 'ನೋಂದಾಯಿತ ಇಮೇಲ್' : 'Email'}: {session?.email} | {t.mobile}: {session?.mobile}
          </div>
        </div>

        <div className="flex gap-2">
          <Link href="/profile" className="gov-btn gov-btn-secondary text-xs">
            {t.profile}
          </Link>
          <Link href="/scholarships/MNC" className="gov-btn gov-btn-primary text-xs">
            {t.apply_new_scholarship}
          </Link>
        </div>
      </div>

      {/* Applications List */}
      <div className="border border-gray-300 bg-white mb-8">
        <div className="gov-header-bar flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-wide">
            {t.my_applications}
          </h2>
          <span className="text-xs font-normal text-gray-600">
            {lang === 'kn' ? 'ಒಟ್ಟು' : 'Total'}: {applications.length}
          </span>
        </div>

        {applications.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-600">
            <p className="mb-4">{t.no_applications_yet}</p>
            <div className="flex justify-center gap-3">
              <Link href="/apply/MNC" className="gov-btn gov-btn-primary text-xs">
                {t.apply_now} (MNC)
              </Link>
              <Link href="/apply/SSKA" className="gov-btn gov-btn-secondary text-xs">
                {t.apply_now} (SSKA)
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-300 text-gray-700">
                  <th className="p-3 font-bold border-r border-gray-200">{t.app_ref}</th>
                  <th className="p-3 font-bold border-r border-gray-200">{t.app_scheme}</th>
                  <th className="p-3 font-bold border-r border-gray-200">{t.year_of_study} / {t.semester}</th>
                  <th className="p-3 font-bold border-r border-gray-200">{lang === 'kn' ? 'ಮೆರಿಟ್ ಸ್ಕೋರ್' : 'Merit Score'}</th>
                  <th className="p-3 font-bold border-r border-gray-200">{t.app_status}</th>
                  <th className="p-3 font-bold border-r border-gray-200">{t.app_submitted_on}</th>
                  <th className="p-3 font-bold text-center">{t.app_actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="p-3 font-mono font-bold text-[#AC3D47] border-r border-gray-200">
                      {app.ref_no}
                    </td>
                    <td className="p-3 border-r border-gray-200">
                      <div className="font-semibold text-gray-800">
                        {app.data.scholarship_code === 'MNC'
                          ? 'Dr. M.N. Channabasappa Endowment'
                          : app.data.scholarship_code === 'SSKA'
                          ? 'Sri Sripathi K A Memorial'
                          : app.data.scholarship_code}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">Code: {app.data.scholarship_code}</div>
                    </td>
                    <td className="p-3 border-r border-gray-200">
                      {t.year_of_study} {app.data.year_of_study || 1}, {t.semester} {app.data.semester || 1}
                    </td>
                    <td className="p-3 border-r border-gray-200 font-mono font-semibold">
                      {app.merit_score ? `${app.merit_score.toFixed(2)}` : 'N/A'}
                    </td>
                    <td className="p-3 border-r border-gray-200">
                      {getStatusBadge(app.status)}
                    </td>
                    <td className="p-3 border-r border-gray-200 text-gray-600">
                      {new Date(app.updated_at).toLocaleDateString(lang === 'kn' ? 'kn-IN' : 'en-IN')}
                    </td>
                    <td className="p-3 text-center space-x-1 whitespace-nowrap">
                      {app.status === 'draft' || app.status === 'needs_correction' ? (
                        <Link
                          href={`/apply/${app.data.scholarship_code || 'MNC'}`}
                          className="gov-btn gov-btn-primary text-[11px] py-1 px-2.5 min-h-[30px]"
                        >
                          {app.status === 'needs_correction' ? (lang === 'kn' ? 'ತಿದ್ದುಪಡಿ ಮಾಡಿ' : 'Fix & Resubmit') : (lang === 'kn' ? 'ಮುಂದುವರಿಸಿ' : 'Resume Draft')}
                        </Link>
                      ) : (
                        <Link
                          href={`/applications/${app.id}`}
                          className="gov-btn gov-btn-secondary text-[11px] py-1 px-2.5 min-h-[30px]"
                        >
                          {t.view_application}
                        </Link>
                      )}
                      <a
                        href={`/api/applications/${app.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gov-btn gov-btn-outline text-[11px] py-1 px-2.5 min-h-[30px]"
                      >
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Helpful Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-gray-700">
        <div className="border border-gray-300 p-4 bg-white">
          <h3 className="font-bold text-[#AC3D47] mb-2 uppercase tracking-wide">
            {lang === 'kn' ? 'ಮುದ್ರಣ-ಸಿದ್ಧ ಅಧಿಕೃತ ಪಿಡಿಎಫ್ ನಮೂನೆ' : 'Print-Ready PDF Form Verification'}
          </h3>
          <p className="leading-relaxed text-gray-600 mb-2">
            {lang === 'kn'
              ? 'ಪ್ರತಿ ಸಲ್ಲಿಸಿದ ಅರ್ಜಿಯು ನಿಮ್ಮ ಭಾವಚಿತ್ರ, ಡಿಜಿಟಲ್ ಸಹಿಗಳು ಮತ್ತು ಸುರಕ್ಷಿತ ಕ್ಯೂಆರ್ (QR) ಕೋಡ್ ಒಳಗೊಂಡ ಅಧಿಕೃತ ಪಿಡಿಎಫ್ ಅನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ರಚಿಸುತ್ತದೆ.'
              : 'Every submitted application generates an official, tamper-evident PDF with your uploaded photo, digital signatures, and a secure QR code.'}
          </p>
          <p className="leading-relaxed text-gray-600">
            {t.print_instructions}
          </p>
        </div>

        <div className="border border-gray-300 p-4 bg-white">
          <h3 className="font-bold text-[#AC3D47] mb-2 uppercase tracking-wide">
            {lang === 'kn' ? 'ಅರ್ಜಿಯಲ್ಲಿ ತಿದ್ದುಪಡಿಗಳ ಅಗತ್ಯವಿದ್ದರೆ?' : 'Need Corrections?'}
          </h3>
          <p className="leading-relaxed text-gray-600 mb-2">
            {lang === 'kn'
              ? 'ಪರಿಶೀಲನಾ ಸಮಿತಿಯು ಯಾವುದೇ ದಾಖಲೆಯಲ್ಲಿ ಅಥವಾ ವಿವರಗಳಲ್ಲಿ ಅಸಮಂಜಸತೆಯನ್ನು ಕಂಡುಕೊಂಡರೆ, ನಿಮ್ಮ ಅರ್ಜಿಯನ್ನು ಸೂಕ್ತ ಟಿಪ್ಪಣಿಯೊಂದಿಗೆ "ತಿದ್ದುಪಡಿ ಸೂಚಿಸಲಾಗಿದೆ" ಸ್ಥಿತಿಗೆ ಬದಲಾಯಿಸಲಾಗುತ್ತದೆ.'
              : 'If the committee finds any discrepancy in your income certificate or marks, your form will be set to "Needs Correction" with detailed remarks from the reviewer.'}
          </p>
          <p className="leading-relaxed text-gray-600">
            {lang === 'kn'
              ? 'ಹೊಸದಾಗಿ ಪ್ರಾರಂಭಿಸದೆಯೇ ನೀವು ವಿವರಗಳನ್ನು ನವೀಕರಿಸಿ ಮರುಸಲ್ಲಿಸಬಹುದು.'
              : 'You will be notified by email and portal notification to update the missing details and re-submit without starting over.'}
          </p>
        </div>
      </div>
    </div>
  );
}
