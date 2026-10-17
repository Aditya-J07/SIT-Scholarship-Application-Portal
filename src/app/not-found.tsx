import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <div className="gov-card p-8 border-gray-300">
        <div className="inline-block px-3 py-1 bg-gray-100 border border-gray-300 text-xs font-mono font-bold text-gray-700 uppercase mb-4">
          Notice: 404 Page Not Found
        </div>
        <h1 className="text-2xl font-bold text-[#AC3D47] mb-2">
          Page Not Found
        </h1>
        <p className="text-xs text-gray-600 max-w-md mx-auto mb-6 leading-relaxed">
          The requested page could not be located on the SIT Scholarship Application Portal.
          It may have been moved, renamed, or is temporarily unavailable.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3 text-xs">
          <Link
            href="/"
            className="gov-btn gov-btn-primary px-5 py-2.5 font-bold"
          >
            Return to Home
          </Link>
          <Link
            href="/dashboard"
            className="gov-btn border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 px-5 py-2.5 font-bold"
          >
            Student Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
