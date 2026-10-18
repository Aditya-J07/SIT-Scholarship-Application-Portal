"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, AlertCircle, ArrowRight } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error?.message || "Invalid credentials or unauthorized access");
        return;
      }

      // Strict role check: only staff accounts (admin and reviewer) are authorized on admin-login
      if (data.user?.role !== "admin" && data.user?.role !== "reviewer") {
        setError("Access Denied: Staff or Administrator privileges required.");
        return;
      }

      // Check if temporary initial password must be changed
      if (data.mustChangePassword) {
        router.push("/change-password");
        return;
      }

      // Elevate session: route staff to MFA enrolment or verification
      router.push("/admin-login/mfa");
      router.refresh();
    } catch {
      setLoading(false);
      setError("Connection failure. Please check network and try again.");
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-[#AC3D47] mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-900 font-serif">
            Staff & Administrative Portal
          </h2>
          <p className="mt-1 text-xs text-stone-600 uppercase tracking-widest font-semibold">
            SIT Scholarship Portal – Restricted Institutional Access
          </p>
        </div>

        <div className="mt-6 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-stone-200">
          {error && (
            <div
              className="mb-4 bg-red-50 border-l-4 border-red-600 p-4 rounded text-xs text-red-800 flex items-start"
              role="alert"
            >
              <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="admin-email">
                Institutional Email <span className="text-red-600">*</span>
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@example.edu"
                className="gov-input"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="admin-password">
                Password <span className="text-red-600">*</span>
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="gov-input"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="gov-btn gov-btn-primary w-full py-2.5 flex items-center justify-center gap-2"
              >
                {loading ? (
                  "Verifying Access..."
                ) : (
                  <>
                    <span>Authenticate & Access Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-stone-200 pt-4 text-center">
            <p className="text-[11px] text-stone-500">
              This system is restricted to authorized SIT staff and administrators. All login attempts
              and administrative actions are cryptographically signed and logged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
