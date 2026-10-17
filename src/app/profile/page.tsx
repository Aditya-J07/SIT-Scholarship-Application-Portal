'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile, DataRequestRecord } from '@/lib/types';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // DPDP Student Data Requests
  const [dataRequests, setDataRequests] = useState<DataRequestRecord[]>([]);
  const [requestType, setRequestType] = useState<'correction' | 'deletion'>('correction');
  const [requestDetails, setRequestDetails] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [dataReqMessage, setDataReqMessage] = useState<string | null>(null);

  const loadData = () => {
    Promise.all([
      fetch('/api/profile').then((res) => (res.ok ? res.json() : Promise.reject())),
      fetch('/api/profile/data-requests').then((res) => (res.ok ? res.json() : { requests: [] })),
    ])
      .then(([profData, reqData]) => {
        setProfile(profData.profile);
        setDataRequests(reqData.requests || []);
        setLoading(false);
      })
      .catch(() => router.push('/login'));
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const handleIfscLookup = async (ifsc: string) => {
    const cleanIfsc = ifsc.trim().toUpperCase();
    if (/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      try {
        const res = await fetch(`/api/ifsc/${cleanIfsc}`);
        if (res.ok) {
          const result = await res.json();
          if (result.data && profile) {
            setProfile({
              ...profile,
              bank_name: result.data.bank || profile.bank_name,
              bank_branch: result.data.branch ? `${result.data.branch}, ${result.data.city}` : profile.bank_branch,
            });
          }
        }
      } catch (err) {
        console.warn('IFSC lookup error:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
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

  const handleDataRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestDetails.trim()) {
      setDataReqMessage('Please describe your correction or deletion request.');
      return;
    }

    setSubmittingRequest(true);
    setDataReqMessage(null);

    try {
      const res = await fetch('/api/profile/data-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: requestType,
          details: requestDetails.trim(),
        }),
      });

      const resData = await res.json();
      setSubmittingRequest(false);

      if (res.ok) {
        setRequestDetails('');
        setDataReqMessage('Your data request has been officially logged with the Scholarship Committee.');
        loadData();
      } else {
        setDataReqMessage(resData.error?.message || 'Failed to submit data request.');
      }
    } catch {
      setSubmittingRequest(false);
      setDataReqMessage('Network error. Failed to submit data request.');
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
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
      {/* Profile Form */}
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
          <div>
            <label className="block font-bold text-gray-700 mb-1" htmlFor="prof-name">
              Full Name (as registered)
            </label>
            <input
              id="prof-name"
              type="text"
              value={profile?.full_name || ''}
              onChange={(e) => profile && setProfile({ ...profile, full_name: e.target.value })}
              className="gov-input"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="prof-email">
                Institutional Email (read-only)
              </label>
              <input
                id="prof-email"
                type="email"
                value={profile?.email || ''}
                disabled
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
                value={profile?.mobile || ''}
                onChange={(e) => profile && setProfile({ ...profile, mobile: e.target.value })}
                className="gov-input"
                required
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3">
            <h2 className="text-xs font-bold text-[#AC3D47] uppercase tracking-wider mb-2">
              Student Bank Account (for Direct Benefit Transfer)
            </h2>
            <p className="text-[11px] text-gray-500 mb-3">
              Must be the applicant&apos;s personal bank account in a scheduled bank. All numbers are stored with AES-256-GCM encryption.
            </p>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1" htmlFor="prof-bank-holder">
              Account Holder Name
            </label>
            <input
              id="prof-bank-holder"
              type="text"
              value={profile?.bank_account_holder || ''}
              onChange={(e) => profile && setProfile({ ...profile, bank_account_holder: e.target.value })}
              className="gov-input uppercase"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="prof-bank-acc">
                Account Number
              </label>
              <input
                id="prof-bank-acc"
                type="text"
                value={profile?.bank_acc_no || ''}
                onChange={(e) => profile && setProfile({ ...profile, bank_acc_no: e.target.value })}
                placeholder={profile?.bank_acc_last4 ? `XXXX-XXXX-${profile.bank_acc_last4}` : 'Enter full account number'}
                className="gov-input font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="prof-bank-ifsc">
                Bank IFSC Code
              </label>
              <input
                id="prof-bank-ifsc"
                type="text"
                maxLength={11}
                value={profile?.bank_ifsc || ''}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  if (profile) {
                    setProfile({ ...profile, bank_ifsc: val });
                    handleIfscLookup(val);
                  }
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
                onChange={(e) => profile && setProfile({ ...profile, bank_name: e.target.value })}
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
                onChange={(e) => profile && setProfile({ ...profile, bank_branch: e.target.value })}
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

      {/* DPDP Act 2023 - Student Data Rights Section */}
      <div className="gov-card p-6 border-gray-300">
        <div className="border-b border-gray-200 pb-3 mb-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            DPDP Act 2023 Rights
          </div>
          <h2 className="text-lg font-bold text-[#AC3D47]">
            Request Data Correction or Account Deletion
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            Under the Digital Personal Data Protection Act 2023, you have the right to request correction of inaccuracies or deletion of your personal data.
          </p>
        </div>

        {dataReqMessage && (
          <div className="mb-4 bg-blue-50 border border-blue-300 p-2.5 text-xs text-blue-800 font-medium">
            {dataReqMessage}
          </div>
        )}

        <form onSubmit={handleDataRequestSubmit} className="space-y-4 text-xs mb-6">
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Request Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="radio"
                  name="reqType"
                  value="correction"
                  checked={requestType === 'correction'}
                  onChange={() => setRequestType('correction')}
                />
                Correction of Personal Data
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="radio"
                  name="reqType"
                  value="deletion"
                  checked={requestType === 'deletion'}
                  onChange={() => setRequestType('deletion')}
                />
                Deletion of Account & Application Data
              </label>
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1" htmlFor="req-details">
              Request Details & Specific Instructions
            </label>
            <textarea
              id="req-details"
              value={requestDetails}
              onChange={(e) => setRequestDetails(e.target.value)}
              placeholder={
                requestType === 'correction'
                  ? 'Specify the fields that require correction (e.g. incorrect parent name, updated mobile number).'
                  : 'Confirm that you wish to erase your account and understand all active scholarship applications will be withdrawn.'
              }
              rows={3}
              className="gov-input resize-y"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submittingRequest}
            className="gov-btn gov-btn-secondary text-xs font-bold min-h-[38px] disabled:opacity-50"
          >
            {submittingRequest ? 'Submitting Request...' : 'Submit Official Data Request'}
          </button>
        </form>

        {/* Previous Requests Table */}
        {dataRequests.length > 0 && (
          <div className="border border-gray-200 mt-4">
            <div className="bg-gray-50 p-2.5 text-xs font-bold text-gray-700 border-b border-gray-200">
              Your Registered Requests
            </div>
            <div className="divide-y divide-gray-200 text-xs">
              {dataRequests.map((req) => (
                <div key={req.id} className="p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold uppercase font-mono text-[#AC3D47]">
                      {req.request_type}
                    </span>
                    <span className="text-[10px] font-bold uppercase bg-gray-100 px-2 py-0.5 border">
                      Status: {req.status}
                    </span>
                  </div>
                  <div className="text-gray-700 text-[11px] mb-1">
                    {req.details}
                  </div>
                  {req.admin_notes && (
                    <div className="text-gray-500 text-[11px] bg-gray-50 p-1.5 border border-gray-200 mt-1">
                      <strong>Committee Response:</strong> {req.admin_notes}
                    </div>
                  )}
                  <div className="text-[10px] text-gray-400 mt-1">
                    Submitted: {new Date(req.created_at).toLocaleDateString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
