'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageToggle';

export default function RegisterPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    mobile: '',
    password: '',
    confirm_password: '',
    consent_accepted: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirm_password) {
      setError(lang === 'kn' ? 'ಪಾಸ್‌ವರ್ಡ್‌ಗಳು ಹೊಂದಿಕೆಯಾಗುತ್ತಿಲ್ಲ' : 'Passwords do not match');
      return;
    }

    if (!formData.consent_accepted) {
      setError(lang === 'kn' ? 'ನೋಂದಾಯಿಸಲು ನೀವು ಡಿಪಿಡಿಪಿ ಒಪ್ಪಿಗೆಯನ್ನು ಅಂಗೀಕರಿಸಬೇಕು' : 'You must accept the DPDP privacy and consent agreement to register');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error?.message || (lang === 'kn' ? 'ನೋಂದಣಿ ವಿಫಲವಾಗಿದೆ' : 'Registration failed'));
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setLoading(false);
      setError(lang === 'kn' ? 'ಸಂಪರ್ಕ ದೋಷ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.' : 'Connection error. Please try again.');
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
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
            {t.register_title}
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            {t.register_sub}
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-300 p-2.5 text-xs text-red-700 font-medium" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1" htmlFor="reg-name">
              {t.full_name} <span className="text-red-600">*</span>
            </label>
            <input
              id="reg-name"
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value.toUpperCase() })}
              placeholder={lang === 'kn' ? 'ಎಸ್.ಎಸ್.ಎಲ್.ಸಿ ಅಂಕಪಟ್ಟಿಯಂತೆ' : 'AS PER SSLC / SSC MARKS SHEET'}
              className="gov-input uppercase"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1" htmlFor="reg-email">
              {t.email} <span className="text-red-600">*</span>
            </label>
            <input
              id="reg-email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
              placeholder="name@sit.ac.in"
              className="gov-input"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1" htmlFor="reg-mobile">
              {t.mobile} <span className="text-red-600">*</span>
            </label>
            <input
              id="reg-mobile"
              type="tel"
              required
              maxLength={10}
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '') })}
              placeholder="9880123456"
              className="gov-input font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="reg-password">
                {t.password} <span className="text-red-600">*</span>
              </label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="gov-input"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="reg-confirm">
                {lang === 'kn' ? 'ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ' : 'Confirm Password'} <span className="text-red-600">*</span>
              </label>
              <input
                id="reg-confirm"
                type="password"
                required
                minLength={6}
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                className="gov-input"
              />
            </div>
          </div>

          {/* DPDP Consent Checkbox */}
          <div className="border border-gray-300 bg-gray-50 p-3 mt-4">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={formData.consent_accepted}
                onChange={(e) => setFormData({ ...formData, consent_accepted: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded-none border-gray-400 text-[#AC3D47] focus:ring-[#AC3D47]"
              />
              <span className="text-[11px] text-gray-700 leading-relaxed">
                <strong>{lang === 'kn' ? 'ಡಿಪಿಡಿಪಿ ಕಾಯ್ದೆ 2023 ರ ಸಮ್ಮತಿ: ' : 'DPDP Act 2023 Consent: '}</strong>
                {t.dpdp_consent}
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="gov-btn gov-btn-primary w-full text-sm font-bold min-h-[44px] disabled:opacity-50"
          >
            {loading ? (lang === 'kn' ? 'ನೋಂದಾಯಿಸಲಾಗುತ್ತಿದೆ...' : 'Registering Account...') : t.register_button}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-gray-600 border-t border-gray-200 pt-4">
          {t.already_have_account}{' '}
          <Link href="/login" className="font-bold text-[#AC3D47] hover:underline">
            {t.login_link}
          </Link>
        </div>
      </div>
    </div>
  );
}
