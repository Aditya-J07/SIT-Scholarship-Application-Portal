'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, AlertCircle, CheckCircle } from 'lucide-react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reqLength = newPassword.length >= 10;
  const reqUpper = /[A-Z]/.test(newPassword);
  const reqLower = /[a-z]/.test(newPassword);
  const reqDigit = /[0-9]/.test(newPassword);
  const reqSpecial = /[^a-zA-Z0-9]/.test(newPassword);
  const reqMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!reqLength || !reqUpper || !reqLower || !reqDigit || !reqSpecial) {
      setError('Please satisfy all password complexity requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setSuccess('Your password has been securely updated. Redirecting to portal...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-[#AC3D47] mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-900 font-serif">
            Security & Password Update
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            SIT Scholarship Application Portal – Institutional Security
          </p>
        </div>

        <div className="mt-6 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-stone-200">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-600 p-4 rounded text-sm text-red-800 flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded text-sm text-emerald-800 flex items-start">
              <CheckCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Current Password <span className="text-red-600">*</span>
              </label>
              <div className="mt-1 relative">
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#AC3D47] focus:border-[#AC3D47] text-sm"
                  placeholder="Enter current password"
                />
                <Lock className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                New Password <span className="text-red-600">*</span>
              </label>
              <div className="mt-1 relative">
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#AC3D47] focus:border-[#AC3D47] text-sm"
                  placeholder="Enter minimum 10 characters"
                />
                <Lock className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Confirm New Password <span className="text-red-600">*</span>
              </label>
              <div className="mt-1 relative">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#AC3D47] focus:border-[#AC3D47] text-sm"
                  placeholder="Re-enter new password"
                />
                <Lock className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Password Policy Checklist */}
            <div className="bg-stone-50 p-3 rounded border border-stone-200 text-xs space-y-1.5">
              <div className="font-semibold text-stone-700 mb-1">Institutional Password Requirements:</div>
              <div className={`flex items-center ${reqLength ? 'text-emerald-700 font-medium' : 'text-stone-500'}`}>
                <span className="mr-1.5">{reqLength ? '✓' : '•'}</span> Minimum 10 characters in length
              </div>
              <div className={`flex items-center ${reqUpper && reqLower ? 'text-emerald-700 font-medium' : 'text-stone-500'}`}>
                <span className="mr-1.5">{reqUpper && reqLower ? '✓' : '•'}</span> Both uppercase (A-Z) and lowercase (a-z) letters
              </div>
              <div className={`flex items-center ${reqDigit ? 'text-emerald-700 font-medium' : 'text-stone-500'}`}>
                <span className="mr-1.5">{reqDigit ? '✓' : '•'}</span> At least one numerical digit (0-9)
              </div>
              <div className={`flex items-center ${reqSpecial ? 'text-emerald-700 font-medium' : 'text-stone-500'}`}>
                <span className="mr-1.5">{reqSpecial ? '✓' : '•'}</span> At least one special symbol (!@#$%^&*)
              </div>
              {confirmPassword.length > 0 && (
                <div className={`flex items-center ${reqMatch ? 'text-emerald-700 font-medium' : 'text-red-600'}`}>
                  <span className="mr-1.5">{reqMatch ? '✓' : '✕'}</span> Passwords match
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded shadow-sm text-sm font-semibold text-white bg-[#AC3D47] hover:bg-[#8f323a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#AC3D47] disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Updating Password...' : 'Update Password & Continue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
