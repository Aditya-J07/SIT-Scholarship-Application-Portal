'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import LanguageToggle, { useLanguage } from './LanguageToggle';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const [session, setSession] = useState<{ fullName: string; role: string; email: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setSession(data.user);
        } else {
          setSession(null);
        }
      })
      .catch(() => setSession(null));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setSession(null);
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="border-b border-gray-300 bg-white">
      {/* College Institutional Identity Bar */}
      <div className="border-b border-gray-200 bg-[#FAFAFA] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            {/* SIT Official Seal Emblem */}
            <Link href="/" className="shrink-0 flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sit-logo.png"
                alt="Siddaganga Institute of Technology Official Logo"
                className="h-14 w-auto object-contain"
              />
            </Link>
            <div>
              <div className="text-xs font-semibold tracking-wider text-gray-600 uppercase">
                {t.college_society}
              </div>
              <h1 className="text-base sm:text-lg font-bold text-[#AC3D47] leading-tight">
                {t.college_full.toUpperCase()}
              </h1>
              <div className="text-xs text-gray-500 hidden sm:block">
                {t.college_location} | {t.college_sub}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <LanguageToggle />
            {session ? (
              <div className="hidden md:flex items-center gap-2 text-xs border border-gray-300 px-2 py-1 bg-white">
                <span className="font-bold text-[#AC3D47]">{session.fullName}</span>
                <span className="bg-gray-100 text-gray-700 px-1 py-0.5 uppercase text-[10px] border border-gray-200">
                  {session.role}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-red-700 font-semibold hover:underline ml-2"
                >
                  {t.logout}
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/login"
                  className="gov-btn gov-btn-outline text-xs px-3 py-1.5 min-h-[34px]"
                >
                  {t.login}
                </Link>
                <Link
                  href="/register"
                  className="gov-btn gov-btn-primary text-xs px-3 py-1.5 min-h-[34px]"
                >
                  {t.register}
                </Link>
              </div>
            )}
            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden border border-gray-400 p-1.5 text-gray-700"
              aria-label="Toggle navigation menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Official SIT Maroon Portal Navigation Bar */}
      <nav className="bg-[#AC3D47] text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-11 items-center justify-between">
            <div className="hidden md:flex items-center space-x-1 text-sm font-semibold">
              <Link
                href="/"
                className={`px-3 py-2.5 transition-colors ${
                  pathname === '/' ? 'bg-[#8D323A] text-white' : 'text-gray-100 hover:bg-[#8D323A]'
                }`}
              >
                {t.home}
              </Link>
              <Link
                href="/scholarships/MNC"
                className={`px-3 py-2.5 transition-colors ${
                  pathname.startsWith('/scholarships') ? 'bg-[#8D323A] text-white' : 'text-gray-100 hover:bg-[#8D323A]'
                }`}
              >
                {t.scholarships}
              </Link>
              <Link
                href="/dashboard"
                className={`px-3 py-2.5 transition-colors ${
                  pathname.startsWith('/dashboard') || pathname.startsWith('/applications') ? 'bg-[#8D323A] text-white' : 'text-gray-100 hover:bg-[#8D323A]'
                }`}
              >
                {t.dashboard}
              </Link>
              <Link
                href="/profile"
                className={`px-3 py-2.5 transition-colors ${
                  pathname === '/profile' ? 'bg-[#8D323A] text-white' : 'text-gray-100 hover:bg-[#8D323A]'
                }`}
              >
                {t.profile}
              </Link>
              {session?.role === 'admin' && (
                <Link
                  href="/admin"
                  className={`px-3 py-2.5 text-yellow-300 font-bold transition-colors ${
                    pathname.startsWith('/admin') ? 'bg-[#8D323A]' : 'hover:bg-[#8D323A]'
                  }`}
                >
                  {t.admin_portal}
                </Link>
              )}
            </div>

            <div className="text-xs text-gray-200 hidden md:block">
              {t.version_tag}
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#A1343E] bg-[#8D323A] px-4 py-3 space-y-2 text-sm font-medium">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 text-white hover:underline"
            >
              {t.home}
            </Link>
            <Link
              href="/scholarships/MNC"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 text-white hover:underline"
            >
              {t.scholarships}
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 text-white hover:underline"
            >
              {t.dashboard}
            </Link>
            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 text-white hover:underline"
            >
              {t.profile}
            </Link>
            {session?.role === 'admin' && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-1.5 text-yellow-300 font-bold hover:underline"
              >
                {t.admin_portal}
              </Link>
            )}
            <div className="pt-2 border-t border-[#A1343E]">
              {session ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="text-red-300 font-bold"
                >
                  Logout ({session.fullName})
                </button>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-white hover:underline"
                  >
                    {t.login}
                  </Link>
                  <span className="text-gray-400">|</span>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-yellow-300 hover:underline"
                  >
                    {t.register}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
