'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageToggle';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error?.message || 'Invalid credentials');
      } else {
        if (data.mustChangePassword) {
          router.push('/change-password');
        } else if (data.user.role === 'admin' || data.user.role === 'reviewer') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
        router.refresh();
      }
    } catch {
      setLoading(false);
      setError('Connection error. Please try again.');
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="gov-card p-6 border-gray-300">
        <div className="text-center pb-4 mb-4 border-b border-gray-200">
          <div className="flex justify-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/sit-logo.png"
              alt="SIT Logo"
              className="h-16 w-auto object-contain"
            />
          </div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            {t.college_full}
          </div>
          <h1 className="text-xl font-bold text-[#AC3D47] mt-1">
            {t.login_title}
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            {t.login_sub}
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-300 p-2.5 text-xs text-red-700 font-medium" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1" htmlFor="login-email">
              {t.email} <span className="text-red-600">*</span>
            </label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@sit.ac.in"
              className="gov-input"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-gray-700" htmlFor="login-password">
                {t.password} <span className="text-red-600">*</span>
              </label>
              <Link href="/forgot-password" className="text-[11px] text-[#AC3D47] hover:underline">
                {t.forgot_password}
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="gov-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="gov-btn gov-btn-primary w-full text-sm font-bold min-h-[44px] disabled:opacity-50"
          >
            {loading ? t.signing_in : t.sign_in_button}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-gray-600 border-t border-gray-200 pt-4">
          {t.no_account}{' '}
          <Link href="/register" className="font-bold text-[#AC3D47] hover:underline">
            {t.register_link}
          </Link>
        </div>
      </div>
    </div>
  );
}
