'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/profile')
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then((data) => {
        setProfile(data.profile);
        setLoading(false);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const handleIfscLookup = async (ifsc: string) => {
    const cleanIfsc = ifsc.trim().toUpperCase();
    if (/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      try {
        const res = await fetch(`/api/ifsc/${cleanIfsc}`);
        if (res.ok) {
          const result = await res.json();
          if (result.data) {
            setProfile((prev: any) => ({
              ...prev,
              bank_name: result.data.bank || prev.bank_name,
              bank_branch: result.data.branch ? `${result.data.branch}, ${result.data.city}` : prev.bank_branch,
            }));
          }
        }
      } catch (err) {
        console.warn('IFSC lookup error:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      const data = await res.json();
      setSaving(false);

      if (res.ok) {
        setMessage('Profile details updated successfully! These details will pre-fill your next scholarship form.');
      } else {
        setMessage(data.error?.message || 'Failed to update profile');
      }
    } catch {
      setSaving(false);
      setMessage('Network error. Failed to save profile.');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-xs text-gray-600">
        Loading profile details...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="gov-card p-6 border-gray-300">
        <div className="border-b border-gray-200 pb-3 mb-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Applicant Settings
          </div>
          <h1 className="text-xl font-bold text-[#AC3D47]">
            Reusable Student Profile & Bank Details
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Maintain your student record and savings bank details here. These values automatically pre-fill your applications across subsequent academic cycles.
          </p>
        </div>

        {message && (
          <div className="mb-4 bg-emerald-50 border border-emerald-300 p-2.5 text-xs text-emerald-800 font-medium">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="gov-header-bar text-xs">1. Personal & Contact Information</div>

          <div>
            <label className="block font-bold text-gray-700 mb-1" htmlFor="prof-name">
              Full Name (CAPITAL LETTERS)
            </label>
            <input
              id="prof-name"
              type="text"
              value={profile?.full_name || ''}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value.toUpperCase() })}
              className="gov-input uppercase"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="prof-email">
                Registered Email (Login ID)
              </label>
              <input
                id="prof-email"
                type="email"
                disabled
                value={profile?.email || ''}
                className="gov-input bg-gray-100 text-gray-600 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="prof-mobile">
                Mobile Number
              </label>
              <input
                id="prof-mobile"
                type="tel"
                maxLength={10}
                value={profile?.mobile || ''}
                onChange={(e) => setProfile({ ...profile, mobile: e.target.value.replace(/\D/g, '') })}
                className="gov-input font-mono"
              />
            </div>
          </div>

          <div className="gov-header-bar text-xs mt-6">2. Default Savings Bank Account (Student&apos;s Own)</div>

          <div>
            <label className="block font-bold text-gray-700 mb-1" htmlFor="prof-bank-holder">
              Account Holder Name
            </label>
            <input
              id="prof-bank-holder"
              type="text"
              value={profile?.bank_account_holder || ''}
              onChange={(e) => setProfile({ ...profile, bank_account_holder: e.target.value.toUpperCase() })}
              placeholder="AS PER PASSBOOK (STUDENT'S NAME)"
              className="gov-input uppercase"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="prof-bank-acc">
                Savings Bank Account Number
              </label>
              <input
                id="prof-bank-acc"
                type="text"
                value={profile?.bank_acc_no || ''}
                onChange={(e) => setProfile({ ...profile, bank_acc_no: e.target.value })}
                className="gov-input font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="prof-bank-ifsc">
                IFSC Code (Auto-fills Bank & Branch)
              </label>
              <input
                id="prof-bank-ifsc"
                type="text"
                maxLength={11}
                value={profile?.bank_ifsc || ''}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setProfile({ ...profile, bank_ifsc: val });
                  handleIfscLookup(val);
                }}
                placeholder="e.g. SBIN0040523"
                className="gov-input uppercase font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="prof-bank-name">
                Bank Name
              </label>
              <input
                id="prof-bank-name"
                type="text"
                value={profile?.bank_name || ''}
                onChange={(e) => setProfile({ ...profile, bank_name: e.target.value })}
                className="gov-input"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="prof-bank-branch">
                Branch Address
              </label>
              <input
                id="prof-bank-branch"
                type="text"
                value={profile?.bank_branch || ''}
                onChange={(e) => setProfile({ ...profile, bank_branch: e.target.value })}
                className="gov-input"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="gov-btn gov-btn-primary w-full text-sm font-bold min-h-[44px] disabled:opacity-50"
            >
              {saving ? 'Saving Profile...' : 'Save Profile & Bank Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
