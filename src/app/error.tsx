'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log minimal safe event type without PII or sensitive stack traces
    console.error('[Application Error] An unexpected error occurred.');
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <div className="gov-card p-8 border-gray-300">
        <div className="inline-block px-3 py-1 bg-red-100 border border-red-300 text-xs font-mono font-bold text-red-800 uppercase mb-4">
          Notice: Service Temporarily Unavailable
        </div>
        <h1 className="text-2xl font-bold text-[#AC3D47] mb-2">
          An Unexpected Error Occurred
        </h1>
        <p className="text-xs text-gray-600 max-w-md mx-auto mb-6 leading-relaxed">
          The portal encountered an unexpected condition while processing your request.
          Please try again, or return to the main portal page. If the issue persists, contact
          the Scholarship Helpdesk.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => reset()}
            className="gov-btn gov-btn-primary px-5 py-2.5 font-bold"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="gov-btn border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 px-5 py-2.5 font-bold"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
