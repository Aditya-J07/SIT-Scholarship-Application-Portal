'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageToggle';
import { Turnstile, TurnstileRef } from '@/components/Turnstile';

export default function LoginForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<TurnstileRef>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Please enter your email address in the field above first.');
      return;
    }
    setError(null);
    setInfoMessage(null);
    setResending(true);
    try {
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setResending(false);
      setInfoMessage(data.message || 'If your email is unconfirmed, a verification link has been sent.');
    } catch {
      setResending(false);
      setError('Network error. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, turnstileToken }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error?.message || 'Invalid credentials');
        turnstileRef.current?.reset();
        setTurnstileToken('');
      } else {
        if (data.mustChangePassword) {
          router.push('/change-password');
        } else if (data.needsConsent) {
          router.push('/accept-terms');
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
      turnstileRef.current?.reset();
      setTurnstileToken('');
    }
  };

  return (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-300 p-2.5 text-xs text-red-700 font-medium" role="alert">
          {error}
        </div>
      )}

      {infoMessage && (
        <div className="mb-4 bg-blue-50 border border-blue-300 p-2.5 text-xs text-blue-800 font-medium" role="status">
          {infoMessage}
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
            placeholder="student@example.edu"
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

        <Turnstile
          ref={turnstileRef}
          onVerify={(token) => {
            setTurnstileToken(token);
            setError(null);
          }}
          onExpire={() => setTurnstileToken('')}
          onError={(err) => setError(err || 'Security verification failed')}
        />

        <button
          type="submit"
          disabled={loading}
          className="gov-btn gov-btn-primary w-full text-sm font-bold min-h-[44px] disabled:opacity-50"
        >
          {loading ? t.signing_in : t.sign_in_button}
        </button>
      </form>

      <div className="mt-5 text-center text-xs text-gray-600 border-t border-gray-200 pt-4 space-y-2">
        <div>
          {t.no_account}{' '}
          <Link href="/register" className="font-bold text-[#AC3D47] hover:underline">
            {t.register_link}
          </Link>
        </div>
        <div>
          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={resending}
            className="text-[#AC3D47] hover:underline font-semibold disabled:opacity-50"
          >
            {resending ? 'Sending verification email...' : 'Resend confirmation email'}
          </button>
        </div>
        <div className="pt-2 border-t border-gray-100 flex items-center justify-center gap-3 text-[11px] text-gray-500">
          <Link href="/privacy" className="hover:text-[#AC3D47] hover:underline">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-[#AC3D47] hover:underline">
            Terms of Use
          </Link>
          <span>•</span>
          <Link href="/faq" className="hover:text-[#AC3D47] hover:underline">
            FAQ
          </Link>
        </div>
      </div>
    </>
  );
}
