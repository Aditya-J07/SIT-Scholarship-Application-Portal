'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from './LanguageToggle';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="mt-auto border-t border-gray-300 bg-[#F8FAFC] text-gray-700 text-xs">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        
        {/* Top Section: College Header, Accreditation, and Social Channels */}
        <div className="border-b border-gray-300 pb-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sit-logo.png"
                alt="SIT Logo"
                className="h-16 w-auto object-contain shrink-0"
              />
              <div>
                <h2 className="font-bold text-[#AC3D47] text-base sm:text-lg uppercase tracking-wide">
                  {t.college_full}, Tumakuru
                </h2>
                <p className="text-gray-700 text-xs font-medium mt-0.5">
                  Dr. Sree Sree Sivakumara Swamiji Road, Tumakuru – 572 103, Karnataka, India
                </p>
                <p className="text-gray-500 text-[11px] mt-1 max-w-2xl leading-relaxed">
                  (An Autonomous institute affiliated to Visvesvaraya Technological University, Belagavi, Approved by AICTE, New Delhi, Accredited by NAAC with “A++” Grade)
                </p>
              </div>
            </div>

            {/* Official Social Links */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-500 uppercase mr-1">Connect:</span>
              <a
                href="https://www.linkedin.com/school/sit-tumkur/posts/?feedView=all"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 hover:text-[#AC3D47] hover:border-[#AC3D47] font-semibold text-[11px] transition-colors"
                title="LinkedIn"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                LinkedIn
              </a>
              <a
                href="https://www.facebook.com/sitsocialmedia%20"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 hover:text-[#AC3D47] hover:border-[#AC3D47] font-semibold text-[11px] transition-colors"
                title="Facebook"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                Facebook
              </a>
              <a
                href="https://www.instagram.com/sit_tumakuru/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 hover:text-[#AC3D47] hover:border-[#AC3D47] font-semibold text-[11px] transition-colors"
                title="Instagram"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                Instagram
              </a>
              <a
                href="https://youtube.com/@tbisiddagangainstituteofte8455?si=WJqS_o_UPd7IPxh2"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 hover:text-[#AC3D47] hover:border-[#AC3D47] font-semibold text-[11px] transition-colors"
                title="YouTube"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                YouTube
              </a>
              <a
                href="https://github.com/Aditya-J07"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 hover:text-[#AC3D47] hover:border-[#AC3D47] font-semibold text-[11px] transition-colors"
                title="GitHub"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                GitHub
              </a>
            </div>
          </div>
        </div>

        {/* 4-Column Main Directory */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          
          {/* Column 1: Internal Portals */}
          <div>
            <h3 className="font-bold text-[#AC3D47] text-xs uppercase tracking-wider mb-3 border-b border-gray-200 pb-1.5">
              {t.footer_internal_links_title}
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li>
                <a href="https://moodle.sit.ac.in/moodle/" target="_blank" rel="noopener noreferrer" className="hover:text-[#AC3D47] hover:underline flex items-center justify-between">
                  <span>Moodle (LMS)</span>
                  <span className="text-[10px] text-gray-400">↗</span>
                </a>
              </li>
              <li>
                <a href="http://icl.sit.ac.in/placement/PlacementServlet?handler=announcementtitle&action=announcementtitle" target="_blank" rel="noopener noreferrer" className="hover:text-[#AC3D47] hover:underline flex items-center justify-between">
                  <span>Placement Portal</span>
                  <span className="text-[10px] text-gray-400">↗</span>
                </a>
              </li>
              <li>
                <a href="http://icl.sit.ac.in/optionals/OptionalsServlet?handler=login&action=getIndexPage" target="_blank" rel="noopener noreferrer" className="hover:text-[#AC3D47] hover:underline flex items-center justify-between">
                  <span>Open Electives Registration</span>
                  <span className="text-[10px] text-gray-400">↗</span>
                </a>
              </li>
              <li>
                <a href="http://erp.sit.ac.in/griv/" target="_blank" rel="noopener noreferrer" className="hover:text-[#AC3D47] hover:underline flex items-center justify-between">
                  <span>Online Grievance Form</span>
                  <span className="text-[10px] text-gray-400">↗</span>
                </a>
              </li>
              <li>
                <a href="https://sims.sit.ac.in/webfiles/" target="_blank" rel="noopener noreferrer" className="hover:text-[#AC3D47] hover:underline flex items-center justify-between">
                  <span>SIMS Faculty Portal</span>
                  <span className="text-[10px] text-gray-400">↗</span>
                </a>
              </li>
              <li>
                <a href="https://sims.sit.ac.in/parents/" target="_blank" rel="noopener noreferrer" className="hover:text-[#AC3D47] hover:underline flex items-center justify-between">
                  <span>SIMS Students / Parents</span>
                  <span className="text-[10px] text-gray-400">↗</span>
                </a>
              </li>
              <li className="pt-1">
                <a href="https://sit.ac.in/pay-fees/" target="_blank" rel="noopener noreferrer" className="inline-block px-2.5 py-1 bg-[#AC3D47] text-white font-bold hover:bg-[#8D323A] text-[11px]">
                  PAY FEES ONLINE ↗
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Other Information & Institutional Links */}
          <div>
            <h3 className="font-bold text-[#AC3D47] text-xs uppercase tracking-wider mb-3 border-b border-gray-200 pb-1.5">
              {t.footer_other_info_title}
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li>
                <a href="https://sit.ac.in/wp-content/uploads/2026/04/SIT-Brochure.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-[#AC3D47] hover:underline flex items-center justify-between">
                  <span>Download SIT Brochure</span>
                  <span className="text-[10px] text-gray-400">PDF ↗</span>
                </a>
              </li>
              <li>
                <a href="https://sit.ac.in/wp-content/uploads/2026/04/Academic_Rules_and_Regulations_2025-26.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-[#AC3D47] hover:underline flex items-center justify-between">
                  <span>Academic Rules (2025-26)</span>
                  <span className="text-[10px] text-gray-400">PDF ↗</span>
                </a>
              </li>
              <li>
                <a href="https://sit.ac.in/admission/#cut-off" target="_blank" rel="noopener noreferrer" className="hover:text-[#AC3D47] hover:underline flex items-center justify-between">
                  <span>Cut-off-Rank (AY 2025-26)</span>
                  <span className="text-[10px] text-gray-400">↗</span>
                </a>
              </li>
              <li>
                <Link href="/scholarships/MNC" className="hover:text-[#AC3D47] hover:underline block">
                  Dr. M.N. Channabasappa Rules
                </Link>
              </li>
              <li>
                <Link href="/scholarships/SSKA" className="hover:text-[#AC3D47] hover:underline block">
                  Sri Sripathi K A Memorial Scheme
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#AC3D47] hover:underline block">
                  Student Dashboard / Track Status
                </Link>
              </li>
              <li>
                <a href="http://www.sit.ac.in" target="_blank" rel="noopener noreferrer" className="hover:text-[#AC3D47] hover:underline font-semibold block text-[#AC3D47]">
                  {t.footer_link_sit}
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Anti Ragging & Placement Contact */}
          <div>
            <h3 className="font-bold text-[#AC3D47] text-xs uppercase tracking-wider mb-3 border-b border-gray-200 pb-1.5">
              {t.footer_anti_ragging_title}
            </h3>
            <div className="bg-white border border-gray-200 p-3 mb-4 leading-relaxed">
              <div className="font-bold text-gray-800">SIT Scholarship Cell / Helpdesk</div>
              <div className="text-[11px] text-gray-500">{/* TODO [COLLEGE DECISION REQUIRED]: Designate official nodal officer */}Nodal Officer (Scholarships)</div>
              <div className="mt-1 font-mono text-[#AC3D47]">
                {/* TODO [COLLEGE DECISION REQUIRED]: Designate official scholarship email */}
                <span className="text-gray-700">helpdesk@sit.ac.in (TODO: Confirm official email)</span>
              </div>
              <div className="font-mono text-[11px] text-gray-700 mt-0.5">
                0816-2214002
              </div>
            </div>

            <h3 className="font-bold text-[#AC3D47] text-xs uppercase tracking-wider mb-2 border-b border-gray-200 pb-1.5">
              {t.footer_placement_contact_title}
            </h3>
            <div className="space-y-1 text-gray-600 font-mono text-[11px]">
              <div>
                <a href="mailto:placements@sit.ac.in" className="hover:text-[#AC3D47] hover:underline">placements@sit.ac.in</a>
              </div>
              <div>
                <a href="mailto:chowdarikk@sit.ac.in" className="hover:text-[#AC3D47] hover:underline">chowdarikk@sit.ac.in</a>
              </div>
              <div>
                <a href="mailto:santhosh@sit.ac.in" className="hover:text-[#AC3D47] hover:underline">santhosh@sit.ac.in</a>
              </div>
            </div>
          </div>

          {/* Column 4: College Administration & Scholarship Helpdesk */}
          <div>
            <h3 className="font-bold text-[#AC3D47] text-xs uppercase tracking-wider mb-3 border-b border-gray-200 pb-1.5">
              {t.footer_contact_info_title}
            </h3>
            <div className="space-y-1.5 text-gray-600 mb-4 leading-relaxed">
              <div>
                <span className="font-semibold text-gray-700">Principal Office:</span>
                <a href="mailto:principal@sit.ac.in" className="block font-mono text-[#AC3D47] hover:underline">
                  principal@sit.ac.in
                </a>
              </div>
              <div className="font-mono text-[11px] space-y-0.5">
                <div>+91 816 - 2282696</div>
                <div>+91 816 - 2214001</div>
                <div>+91 816 - 2282994</div>
              </div>
            </div>

            <h3 className="font-bold text-[#AC3D47] text-xs uppercase tracking-wider mb-2 border-b border-gray-200 pb-1.5">
              {t.footer_contact_title}
            </h3>
            <div className="text-gray-600 space-y-1 text-[11px] leading-relaxed">
              <div>{t.footer_contact_hours}</div>
              <div className="font-mono text-[#AC3D47]">
                <a href="mailto:scholarships@sit.ac.in" className="hover:underline">scholarships@sit.ac.in</a>
              </div>
              <div className="font-mono">0816-2214000</div>
              <div>Administrative Block, Ground Floor</div>
            </div>
          </div>

        </div>

        {/* DPDP Act 2023 Compliance & Privacy Notice */}
        <div className="border-t border-gray-200 pt-4 pb-2">
          <div className="bg-white border border-gray-300 p-3 text-gray-600 leading-relaxed text-[11px]">
            <span className="font-bold text-[#AC3D47]">{t.footer_dpdp_title} </span>
            {t.footer_dpdp_text}
          </div>
        </div>

        {/* Bottom Copyright and Accreditations */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-gray-500 pt-3 text-[11px]">
          <div>
            {t.footer_copyright}
          </div>
          <div className="mt-1 sm:mt-0 font-medium">
            NAAC “A++” Accredited • Autonomous VTU Belagavi • AICTE Approved
          </div>
        </div>
      </div>
    </footer>
  );
}
