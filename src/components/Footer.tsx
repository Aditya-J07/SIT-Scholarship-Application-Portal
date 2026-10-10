'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from './LanguageToggle';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="mt-auto border-t border-gray-300 bg-[#F8FAFC] text-gray-700 text-xs">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sit-logo.png"
                alt="SIT Logo"
                className="h-12 w-auto object-contain"
              />
              <h2 className="font-bold text-[#AC3D47] text-sm uppercase tracking-wider">
                {t.footer_address_title}
              </h2>
            </div>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">
              {t.footer_address_lines}
            </p>
          </div>

          <div>
            <h2 className="font-bold text-[#AC3D47] text-sm mb-2 uppercase tracking-wider">
              {t.footer_contact_title}
            </h2>
            <div className="text-gray-600 leading-relaxed space-y-1">
              <div>{t.footer_contact_hours}</div>
              <div>
                <span className="font-mono text-[#AC3D47]">{t.footer_contact_email}</span>
              </div>
              <div className="font-mono">{t.footer_contact_phone}</div>
              <div>{t.footer_contact_loc}</div>
            </div>
          </div>

          <div>
            <h2 className="font-bold text-[#AC3D47] text-sm mb-2 uppercase tracking-wider">
              {t.footer_links_title}
            </h2>
            <ul className="space-y-1.5 text-gray-600">
              <li>
                <Link href="/scholarships/MNC" className="hover:text-[#AC3D47] hover:underline">
                  Dr. M.N. Channabasappa Endowment Rules
                </Link>
              </li>
              <li>
                <Link href="/scholarships/SSKA" className="hover:text-[#AC3D47] hover:underline">
                  Sri Sripathi K A Memorial Scholarship
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#AC3D47] hover:underline">
                  {t.dashboard} / {t.track_status}
                </Link>
              </li>
              <li>
                <a href="http://www.sit.ac.in" target="_blank" rel="noopener noreferrer" className="hover:text-[#AC3D47] hover:underline">
                  {t.footer_link_sit}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* DPDP Act 2023 Compliance & Privacy Notice */}
        <div className="border-t border-gray-200 pt-4 pb-2">
          <div className="bg-white border border-gray-300 p-3 text-gray-600 leading-relaxed">
            <span className="font-bold text-[#AC3D47]">{t.footer_dpdp_title} </span>
            {t.footer_dpdp_text}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between text-gray-500 pt-3 text-[11px]">
          <div>
            {t.footer_copyright}
          </div>
          <div className="mt-1 sm:mt-0 font-medium">
            {t.footer_tagline}
          </div>
        </div>
      </div>
    </footer>
  );
}
