"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
  KeyRound,
  ArrowRight,
  PlusCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface TotpFactor {
  id: string;
  friendlyName: string;
  factorType: string;
  status: "verified" | "unverified";
  createdAt: string;
}

interface MfaStatusResponse {
  currentLevel: "aal1" | "aal2";
  nextLevel: "aal1" | "aal2";
  enrolled: boolean;
  factors: TotpFactor[];
  user: {
    id: string;
    email: string;
    role: string;
    fullName: string;
  };
}

export default function AdminMfaPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<MfaStatusResponse | null>(null);

  // Verification state
  const [selectedFactorId, setSelectedFactorId] = useState<string>("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState(false);

  // Enrolment state
  const [enrolling, setEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState<{
    factorId: string;
    friendlyName: string;
    qrCode: string;
    secret: string;
    uri: string;
  } | null>(null);
  const [enrollCode, setEnrollCode] = useState("");
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // 1. Fetch current MFA status
  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/mfa/status");
      if (!res.ok) {
        if (res.status === 401) {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- hard redirect keeps auth cookies
          window.location.href = "/admin-login";
          return;
        }
        if (res.status === 403) {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- hard redirect keeps auth cookies
          window.location.href = "/login";
          return;
        }
        throw new Error("Failed to load MFA status");
      }

      const data: MfaStatusResponse = await res.json();
      setStatus(data);

      const verifiedFactors = data.factors.filter((f) => f.status === "verified");
      if (verifiedFactors.length > 0) {
        setSelectedFactorId(verifiedFactors[0].id);
      }

      // If user has NO factors at all, automatically begin primary enrolment
      if (verifiedFactors.length === 0) {
        startEnrollment("Primary Authenticator Device");
      }

      setLoading(false);
    } catch (err: unknown) {
      setLoading(false);
      setVerifyError(err instanceof Error ? err.message : "Error connecting to authentication service");
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // 2. Start Enrolment
  const startEnrollment = async (friendlyName: string) => {
    setEnrolling(true);
    setEnrollError(null);
    setEnrollData(null);
    setEnrollCode("");

    try {
      const res = await fetch("/api/auth/mfa/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendlyName }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEnrollError(data.error?.message || "Failed to initialize enrollment");
        return;
      }

      setEnrollData({
        factorId: data.factorId,
        friendlyName: data.friendlyName,
        qrCode: data.totp.qrCode,
        secret: data.totp.secret,
        uri: data.totp.uri,
      });
    } catch {
      setEnrollError("Network error while generating QR code. Please try again.");
    }
  };

  // 3. Complete Enrolment Verification
  const handleEnrollVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollData || enrollCode.length !== 6) return;

    setEnrollLoading(true);
    setEnrollError(null);

    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factorId: enrollData.factorId,
          code: enrollCode,
        }),
      });

      const data = await res.json();
      setEnrollLoading(false);

      if (!res.ok) {
        setEnrollError(data.error?.message || "Invalid verification code. Please check your authenticator.");
        return;
      }

      setEnrolling(false);
      setEnrollData(null);
      setVerifySuccess(true);
      await loadStatus();
    } catch {
      setEnrollLoading(false);
      setEnrollError("Verification failed due to connection error. Please try again.");
    }
  };

  // 4. Verify Existing Factor (aal1 -> aal2)
  const handleVerifyExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFactorId || verifyCode.length !== 6) return;

    setVerifyLoading(true);
    setVerifyError(null);

    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factorId: selectedFactorId,
          code: verifyCode,
        }),
      });

      const data = await res.json();
      setVerifyLoading(false);

      if (!res.ok) {
        setVerifyError(data.error?.message || "Invalid or expired verification code.");
        return;
      }

      setVerifySuccess(true);
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- hard redirect keeps auth cookies
      window.location.href = "/admin";
    } catch {
      setVerifyLoading(false);
      setVerifyError("Verification failed due to connection error. Please try again.");
    }
  };

  const copySecretToClipboard = () => {
    if (enrollData?.secret) {
      navigator.clipboard.writeText(enrollData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="text-center text-xs text-stone-600 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#AC3D47]" />
          Checking multi-factor authentication status...
        </div>
      </div>
    );
  }

  const verifiedFactors = status?.factors.filter((f) => f.status === "verified") || [];
  const isAal2 = status?.currentLevel === "aal2" || verifySuccess;

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-[#AC3D47] mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-900 font-serif">
            Staff Multi-Factor Authentication
          </h2>
          <p className="mt-1 text-xs text-stone-600 uppercase tracking-widest font-semibold">
            SIT Scholarship Portal – TOTP Security Guard
          </p>
        </div>

        <div className="mt-6 bg-white py-6 px-4 shadow sm:rounded-lg sm:px-8 border border-stone-200">
          {/* Top Banner / User Context */}
          <div className="mb-5 pb-3 border-b border-stone-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-stone-500">Logged in as:</span>{" "}
              <span className="font-semibold text-stone-800">{status?.user?.email}</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                isAal2
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-amber-100 text-amber-800 border border-amber-300"
              }`}
            >
              {isAal2 ? "AAL2 Secured" : "AAL1 (MFA Needed)"}
            </span>
          </div>

          {/* Error Banner */}
          {verifyError && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-600 p-3 rounded text-xs text-red-800 flex items-start">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
              <span>{verifyError}</span>
            </div>
          )}

          {/* Success Banner */}
          {verifySuccess && (
            <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-600 p-3 rounded text-xs text-emerald-900 flex items-start">
              <Check className="w-4 h-4 mr-2 shrink-0 mt-0.5 text-emerald-700" />
              <div>
                <p className="font-bold">MFA Verification Complete!</p>
                <p className="text-[11px] mt-0.5">
                  Your session is elevated to Authenticator Assurance Level 2 (AAL2).
                </p>
              </div>
            </div>
          )}

          {/* VIEW 1: ENROLMENT MODE (First device OR backup second device) */}
          {enrolling && enrollData && (
            <div className="space-y-4">
              <div className="bg-stone-50 border border-stone-200 p-3 rounded text-xs">
                <div className="font-bold text-stone-800 mb-1 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-[#AC3D47]" />
                  Enrol: {enrollData.friendlyName}
                </div>
                <p className="text-stone-600 text-[11px] leading-relaxed">
                  Scan this QR code with your authenticator app (Google Authenticator, Microsoft
                  Authenticator, 1Password, or Authy), then enter the 6-digit code below.
                </p>
              </div>

              {enrollError && (
                <div className="bg-red-50 border-l-4 border-red-600 p-3 rounded text-xs text-red-800">
                  {enrollError}
                </div>
              )}

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-4 bg-white border border-stone-300 rounded">
                {enrollData.qrCode ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={enrollData.qrCode}
                    alt="TOTP MFA QR Code"
                    className="w-48 h-48 border border-stone-200 rounded p-1 bg-white"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-stone-100 text-stone-400 text-xs text-center p-4">
                    QR Code unavailable. Use manual secret below.
                  </div>
                )}

                {/* Secret Key with Copy */}
                <div className="mt-3 w-full">
                  <div className="text-[11px] text-stone-500 font-medium mb-1">
                    Manual Entry Secret Key:
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      readOnly
                      value={enrollData.secret}
                      className="w-full font-mono text-[11px] bg-stone-100 border border-stone-300 rounded px-2 py-1 text-stone-800 select-all"
                    />
                    <button
                      type="button"
                      onClick={copySecretToClipboard}
                      className="px-2.5 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded text-xs flex items-center gap-1 transition-colors shrink-0"
                      title="Copy Secret"
                    >
                      {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="text-[10px]">{copiedSecret ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Verification Form */}
              <form onSubmit={handleEnrollVerify} className="space-y-3">
                <div>
                  <label htmlFor="enroll-code" className="block text-xs font-bold text-stone-700 mb-1">
                    Enter 6-Digit Authenticator Code <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="enroll-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    placeholder="000000"
                    value={enrollCode}
                    onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full font-mono text-center text-lg tracking-[0.3em] font-bold border border-stone-300 rounded py-2 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#AC3D47]"
                  />
                </div>

                <div className="flex gap-2">
                  {verifiedFactors.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setEnrolling(false)}
                      className="w-1/3 py-2 px-3 border border-stone-300 rounded text-xs font-semibold text-stone-700 hover:bg-stone-100"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={enrollLoading || enrollCode.length !== 6}
                    className="flex-1 py-2 px-4 bg-[#AC3D47] hover:bg-[#8e323b] text-white rounded text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {enrollLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Verify & Activate Device
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW 2: VERIFICATION PROMPT (aal1 with existing verified factors) */}
          {!enrolling && !isAal2 && verifiedFactors.length > 0 && (
            <form onSubmit={handleVerifyExisting} className="space-y-4">
              <div className="bg-stone-50 border border-stone-200 p-3 rounded text-xs">
                <div className="font-bold text-stone-800 mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-[#AC3D47]" />
                  Enter Authenticator Code
                </div>
                <p className="text-stone-600 text-[11px] leading-relaxed">
                  Open your TOTP authenticator app and enter the current 6-digit numeric security code
                  to access the administrative console.
                </p>
              </div>

              {/* Factor Selection (if staff enrolled primary + backup) */}
              {verifiedFactors.length > 1 && (
                <div>
                  <label htmlFor="factor-select" className="block text-xs font-bold text-stone-700 mb-1">
                    Select Verification Device
                  </label>
                  <select
                    id="factor-select"
                    value={selectedFactorId}
                    onChange={(e) => setSelectedFactorId(e.target.value)}
                    className="gov-select w-full text-xs"
                  >
                    {verifiedFactors.map((f, idx) => (
                      <option key={f.id} value={f.id}>
                        {f.friendlyName || `Device #${idx + 1}`} (Verified)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="verify-code" className="block text-xs font-bold text-stone-700 mb-1">
                  6-Digit Security Code <span className="text-red-600">*</span>
                </label>
                <input
                  id="verify-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full font-mono text-center text-lg tracking-[0.3em] font-bold border border-stone-300 rounded py-2 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#AC3D47]"
                />
              </div>

              <button
                type="submit"
                disabled={verifyLoading || verifyCode.length !== 6}
                className="w-full py-2.5 px-4 bg-[#AC3D47] hover:bg-[#8e323b] text-white rounded text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {verifyLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Authenticating...
                  </>
                ) : (
                  <>
                    Verify & Continue <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="pt-2 border-t border-stone-200 text-center text-[11px] text-stone-500">
                Lost access to your primary device?{" "}
                {verifiedFactors.length > 1 ? (
                  <span className="text-stone-700 font-semibold">Switch to your backup device above.</span>
                ) : (
                  <span className="text-stone-700">
                    Contact secondary administrator to reset your factors.
                  </span>
                )}
              </div>
            </form>
          )}

          {/* VIEW 3: AAL2 SECURED (Management & Backup Device Enrolment) */}
          {!enrolling && isAal2 && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-300 p-3 rounded text-xs text-emerald-900">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Active AAL2 Authenticated Session
                </div>
                <p className="text-[11px] text-emerald-800">
                  Your staff session has completed multi-factor authentication. You may now access all
                  administrative review workflows.
                </p>
              </div>

              {/* List of Enrolled Factors */}
              <div>
                <div className="text-xs font-bold text-stone-700 mb-2">
                  Enrolled Authenticator Devices ({verifiedFactors.length}):
                </div>
                <div className="space-y-2">
                  {verifiedFactors.map((factor, idx) => (
                    <div
                      key={factor.id}
                      className="flex items-center justify-between p-2.5 bg-stone-50 border border-stone-200 rounded text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-stone-600" />
                        <div>
                          <div className="font-semibold text-stone-800">
                            {factor.friendlyName || `Device #${idx + 1}`}
                          </div>
                          <div className="text-[10px] text-stone-500">
                            Enrolled: {new Date(factor.createdAt).toLocaleDateString("en-IN")}
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px]">
                        ✓ Active
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Option to enroll SECOND factor (Backup device) */}
              {verifiedFactors.length < 2 ? (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded text-xs text-amber-900">
                  <div className="font-bold flex items-center gap-1 mb-1 text-amber-950">
                    <PlusCircle className="w-4 h-4 text-amber-700" />
                    Enrol a Backup Device (Second Factor)
                  </div>
                  <p className="text-[11px] text-amber-800 mb-3">
                    Institutional policy strongly recommends registering a backup authenticator
                    (e.g., secondary tablet, hardware key, or office laptop) so you never get locked out.
                  </p>
                  <button
                    type="button"
                    onClick={() => startEnrollment("Backup Authenticator Device")}
                    className="w-full py-2 px-3 bg-amber-700 hover:bg-amber-800 text-white rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Enrol Backup Device (Second Factor)
                  </button>
                </div>
              ) : (
                <div className="bg-stone-50 border border-stone-200 p-2.5 rounded text-[11px] text-stone-600 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Maximum backup devices enrolled. Two active factors configured.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- hard redirect keeps auth cookies
                    window.location.href = "/admin";
                  }}
                  className="w-full py-2.5 px-4 bg-[#AC3D47] hover:bg-[#8e323b] text-white rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  Enter Administrative Console <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
