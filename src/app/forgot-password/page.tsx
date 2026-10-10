import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="gov-card p-6 border-gray-300 text-center">
        <h1 className="text-xl font-bold text-[#AC3D47] mb-3">
          Password Reset & Account Assistance
        </h1>
        <p className="text-xs text-gray-700 leading-relaxed mb-6">
          For institutional security, password resets are processed in coordination with the college Accounts & Scholarship Section or via email verification.
        </p>

        <div className="border border-gray-200 bg-gray-50 p-4 text-xs text-left mb-6 space-y-2">
          <div className="font-bold text-[#AC3D47]">To reset your password:</div>
          <ol className="list-decimal list-inside space-y-1 text-gray-700">
            <li>Visit the Accounts Section (Admin Block, Ground Floor) with your College ID Card.</li>
            <li>Alternatively, send an email from your registered address to <span className="font-mono text-[#AC3D47]">scholarships@sit.ac.in</span> mentioning your USN and Full Name.</li>
          </ol>
        </div>

        <Link href="/login" className="gov-btn gov-btn-primary text-xs px-4 py-2">
          ← Return to Login
        </Link>
      </div>
    </div>
  );
}
