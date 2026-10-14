import Link from 'next/link';
import { db } from '@/lib/db';

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ ref_no: string }>;
}) {
  const { ref_no } = await params;
  const application = await db.findApplicationByRefNo(ref_no);
  const scholarship = application ? await db.findScholarshipByCode(application.data.scholarship_code || '') : null;
  const cycle = application ? await db.findCycleById(application.cycle_id) : null;

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="border-2 border-gray-300 bg-white p-6 shadow-none">
        <div className="text-center pb-4 mb-4 border-b border-gray-200">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Siddaganga Institute of Technology, Tumakuru
          </div>
          <h1 className="text-lg font-bold text-[#AC3D47] mt-1">
            Application Verification Portal
          </h1>
          <div className="text-[11px] text-gray-500">
            Document Authentication & QR Verification Service
          </div>
        </div>

        {application ? (
          <div>
            <div className="bg-emerald-50 border border-emerald-300 p-3 mb-5 flex items-center justify-between text-xs text-emerald-900">
              <span className="font-bold flex items-center gap-1.5">
                ✓ Authentic College Record Verified
              </span>
              <span className="font-mono bg-emerald-700 text-white px-2 py-0.5 font-bold uppercase text-[10px]">
                Valid
              </span>
            </div>

            <div className="space-y-3 text-xs border border-gray-200 p-4 bg-gray-50 mb-5">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Application Reference:</span>
                <span className="font-mono font-bold text-[#AC3D47]">{application.ref_no}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Scholarship Scheme:</span>
                <span className="font-bold text-gray-800 text-right">{scholarship?.name || application.data.scholarship_code}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Academic Cycle:</span>
                <span className="font-semibold text-gray-800">{cycle?.academic_year || '2026–2027'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Current Status:</span>
                <span className="font-bold uppercase text-[#AC3D47]">
                  {application.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Submission Timestamp:</span>
                <span className="font-mono text-gray-700">
                  {application.submitted_at
                    ? new Date(application.submitted_at).toLocaleString('en-IN')
                    : 'Draft Status'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Digital Form Integrity:</span>
                <span className="font-mono text-[10px] text-gray-700 truncate max-w-[200px]">
                  {application.pdf_sha256 ? `${application.pdf_sha256.substring(0, 16)}...` : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500 font-medium">Physical Copy Received:</span>
                <span className={`font-semibold ${application.hard_copy_received ? 'text-emerald-700' : 'text-gray-600'}`}>
                  {application.hard_copy_received ? 'Yes, Logged in Accounts' : 'Pending Physical Delivery'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 leading-relaxed mb-4 text-center">
              Under the DPDP Act 2023, personal student data (including marks, mobile, and bank details) is concealed on public verification lookups.
            </p>

            <div className="text-center">
              <Link href="/" className="gov-btn gov-btn-secondary text-xs px-4 py-1.5">
                ← Return to Portal Home
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-red-700 font-bold text-sm mb-2">
              Record Not Found
            </div>
            <p className="text-xs text-gray-600 mb-5 leading-relaxed">
              No application was found matching reference number <span className="font-mono font-bold">{ref_no}</span>. Please verify the code on your printed form.
            </p>
            <Link href="/" className="gov-btn gov-btn-primary text-xs px-4 py-1.5">
              Portal Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
