"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { Turnstile, TurnstileRef } from "@/components/Turnstile";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileRef>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error?.message || "Failed to process request. Please try again.");
        turnstileRef.current?.reset();
        setTurnstileToken("");
        return;
      }

      setMessage(
        data.message ||
          "If this email is registered in our portal, a recovery link has been dispatched to your inbox."
      );
    } catch {
      setLoading(false);
      setError("Network communication error. Please check your connection and try again.");
      turnstileRef.current?.reset();
      setTurnstileToken("");
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="gov-card p-6 border-gray-300">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-[#AC3D47] mb-3">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[#AC3D47]">
            Account Recovery & Password Reset
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            SIT Scholarship Portal • Institutional Self-Service Recovery
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-600 p-3 text-xs text-red-800 flex items-start">
            <AlertCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {message ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4 text-xs text-emerald-800 flex items-start">
              <CheckCircle2 className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold mb-1">Request Processed</div>
                <div>{message}</div>
              </div>
            </div>

            <p className="text-[11px] text-gray-500">
              Please check your spam or institutional junk mail folder if you do not receive the email within 5 minutes.
            </p>

            <Link
              href="/login"
              className="gov-btn gov-btn-outline w-full py-2 flex items-center justify-center gap-2 text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Portal Login</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1" htmlFor="reset-email">
                Registered Institutional Email <span className="text-red-600">*</span>
              </label>
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@sit.ac.in or student@gmail.com"
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
              className="gov-btn gov-btn-primary w-full py-2 text-xs"
            >
              {loading ? "Dispatching Recovery Link..." : "Send Password Recovery Link"}
            </button>

            <div className="text-center pt-2">
              <Link href="/login" className="text-xs text-[#AC3D47] hover:underline">
                ← Remember your password? Return to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
