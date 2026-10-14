"use client";

import React, { useState } from "react";
import Link from "next/link";
import { KeyRound, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { validatePasswordStrength } from "@/lib/auth/password-policy";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation password do not match.");
      return;
    }

    const policy = validatePasswordStrength(newPassword);
    if (!policy.valid) {
      setError(policy.error || "Password does not meet institutional security requirements.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      setLoading(false);

      if (updateErr) {
        setError(updateErr.message || "Failed to update password. Recovery link may have expired.");
        return;
      }

      setSuccess(true);
    } catch {
      setLoading(false);
      setError("An unexpected error occurred while updating your password. Please try again.");
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="gov-card p-6 border-gray-300">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-[#AC3D47] mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[#AC3D47]">
            Set New Account Password
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            SIT Scholarship Portal • Institutional Security Policy
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-600 p-3 text-xs text-red-800 flex items-start">
            <AlertCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4 text-xs text-emerald-800 flex items-start">
              <CheckCircle2 className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold mb-1">Password Successfully Updated</div>
                <div>Your new password is now active. You may log in to your account.</div>
              </div>
            </div>

            <Link
              href="/login"
              className="gov-btn gov-btn-primary w-full py-2 flex items-center justify-center gap-2 text-xs"
            >
              <span>Proceed to Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800">
              <span className="font-bold">Password Requirements:</span>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Minimum 10 characters in length</li>
                <li>Cannot contain common dictionary passwords</li>
                <li>Cannot contain your name or email prefix</li>
              </ul>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="new-password">
                New Password <span className="text-red-600">*</span>
              </label>
              <input
                id="new-password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="gov-input"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="confirm-password">
                Confirm New Password <span className="text-red-600">*</span>
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="gov-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="gov-btn gov-btn-primary w-full py-2 text-xs"
            >
              {loading ? "Updating Password..." : "Update Password & Activate Account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
