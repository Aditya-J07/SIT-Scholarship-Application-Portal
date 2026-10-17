'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageToggle';
import { ALL_UPLOAD_KINDS } from '@/lib/constants';

interface FAQItem {
  id: string;
  q_en: string;
  q_kn: string;
  a_en: React.ReactNode;
  a_kn: React.ReactNode;
}

export default function FAQPage() {
  const { lang } = useLanguage();
  const [openId, setOpenId] = useState<string | null>('how-to-apply');

  const toggle = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  const faqs: FAQItem[] = [
    {
      id: 'how-to-apply',
      q_en: '1. How do I apply for a scholarship on this portal?',
      q_kn: '1. ಈ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ವಿದ್ಯಾರ್ಥಿವೇತನಕ್ಕೆ ಅರ್ಜಿ ಸಲ್ಲಿಸುವುದು ಹೇಗೆ?',
      a_en: (
        <div className="space-y-2">
          <p>Applying is a streamlined 6-step online procedure:</p>
          <ol className="list-decimal list-inside space-y-1 pl-1">
            <li><strong>Register:</strong> Create an account using your official SIT college email and mobile number.</li>
            <li><strong>Verify Email:</strong> Click the verification link sent to your inbox.</li>
            <li><strong>Log In:</strong> Sign in with your password and complete the CAPTCHA check.</li>
            <li><strong>Select Scheme:</strong> Review guidelines for Dr. M.N. Channabasappa Endowment (MNC) or SSKA and click &quot;Apply Now&quot;.</li>
            <li><strong>Complete Application Wizard:</strong> Fill out Student Details, Family Information, Academic Marks, Fee Structure, Bank Details, and upload the mandatory documents.</li>
            <li><strong>Review & Submit:</strong> Preview your completed draft, accept the declaration, and submit. You can download your official PDF receipt immediately.</li>
          </ol>
        </div>
      ),
      a_kn: (
        <div className="space-y-2">
          <p>ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಸರಳವಾದ 6 ಹಂತಗಳಿವೆ:</p>
          <ol className="list-decimal list-inside space-y-1 pl-1">
            <li><strong>ನೋಂದಣಿ:</strong> ನಿಮ್ಮ ಕಾಲೇಜು ಇಮೇಲ್ ಮತ್ತು ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯೊಂದಿಗೆ ಖಾತೆಯನ್ನು ರಚಿಸಿ.</li>
            <li><strong>ಇಮೇಲ್ ಪರಿಶೀಲನೆ:</strong> ನಿಮ್ಮ ಇನ್‌ಬಾಕ್ಸ್‌ಗೆ ಬಂದಿರುವ ಪರಿಶೀಲನಾ ಲಿಂಕ್ ಕ್ಲಿಕ್ ಮಾಡಿ.</li>
            <li><strong>ಲಾಗಿನ್:</strong> ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ಬಳಸಿ ಲಾಗಿನ್ ಆಗಿ.</li>
            <li><strong>ಯೋಜನೆ ಆಯ್ಕೆ:</strong> ಎಂ.ಎನ್.ಸಿ ಅಥವಾ ಎಸ್.ಎಸ್.ಕೆ.ಎ ಮಾರ್ಗಸೂಚಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ &quot;ಅರ್ಜಿ ಸಲ್ಲಿಸಿ&quot; ಕ್ಲಿಕ್ ಮಾಡಿ.</li>
            <li><strong>ಅರ್ಜಿ ಭರ್ತಿ:</strong> ವೈಯಕ್ತಿಕ, ಕೌಟುಂಬಿಕ, ಶೈಕ್ಷಣಿಕ, ಬ್ಯಾಂಕ್ ಮತ್ತು ಕಡ್ಡಾಯ ದಾಖಲೆಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.</li>
            <li><strong>ಅಂತಿಮ ಸಲ್ಲಿಕೆ:</strong> ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ, ಪ್ರಮಾಣೀಕರಿಸಿ ಮತ್ತು ಸಲ್ಲಿಸಿ. ನಂತರ ಅಧಿಕೃತ ಪಿಡಿಎಫ್ ಪ್ರತಿಯನ್ನು ಡೌನ್‌ಲೋಡ್ ಮಾಡಿಕೊಳ್ಳಿ.</li>
          </ol>
        </div>
      ),
    },
    {
      id: 'documents-needed',
      q_en: '2. What documents must be kept ready before starting the application?',
      q_kn: '2. ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಮುನ್ನ ಯಾವ ದಾಖಲೆಗಳನ್ನು ಸಿದ್ಧವಾಗಿಟ್ಟುಕೊಳ್ಳಬೇಕು?',
      a_en: (
        <div className="space-y-2">
          <p>You must keep the following <strong>nine (9) mandatory upload documents</strong> ready in clear JPG or PNG format (max 1 MB each for photos/signatures, max 2 MB for certificates):</p>
          <div className="border border-gray-300 bg-gray-50 p-3">
            <ol className="list-decimal list-inside space-y-1.5 font-medium text-gray-800">
              {ALL_UPLOAD_KINDS.map((doc) => (
                <li key={doc.kind}>
                  <strong>{doc.title}</strong>: <span className="text-gray-600 font-normal">{doc.description}</span>
                </li>
              ))}
            </ol>
          </div>
          <p className="text-[11px] text-gray-600">
            <em>Note: Student Aadhaar cards must be uploaded as masked document copies. Aadhaar numbers are never extracted as text or logged.</em>
          </p>
        </div>
      ),
      a_kn: (
        <div className="space-y-2">
          <p>ಅರ್ಜಿ ಪ್ರಾರಂಭಿಸುವ ಮುನ್ನ ಈ ಕೆಳಗಿನ <strong>ಒಂಬತ್ತು (9) ದಾಖಲೆಗಳನ್ನು</strong> ಸಿದ್ಧವಾಗಿಟ್ಟುಕೊಳ್ಳಿ:</p>
          <div className="border border-gray-300 bg-gray-50 p-3">
            <ol className="list-decimal list-inside space-y-1.5 font-medium text-gray-800">
              <li><strong>1. ಪಾಸ್‌ಪೋರ್ಟ್ ಅಳತೆಯ ಭಾವಚಿತ್ರ</strong> (Passport Photograph)</li>
              <li><strong>2. ವಿದ್ಯಾರ್ಥಿಯ ಡಿಜಿಟಲ್ ಸಹಿ</strong> (Student Signature)</li>
              <li><strong>3. ಪೋಷಕರ ಡಿಜಿಟಲ್ ಸಹಿ</strong> (Parent/Guardian Signature)</li>
              <li><strong>4. ಸಿಇಟಿ ಪ್ರವೇಶ ಹಂಚಿಕೆ ಆದೇಶ ಪ್ರತಿ</strong> (CET Admission Order Copy)</li>
              <li><strong>5. ಕೊನೆಯ ಪರೀಕ್ಷೆಯ ಅಂಕಪಟ್ಟಿ</strong> (II PUC ಅಥವಾ ಹಿಂದಿನ ವರ್ಷದ ಬಿ.ಇ ಗ್ರೇಡ್ ಕಾರ್ಡ್)</li>
              <li><strong>6. ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ</strong> (ಕಂದಾಯ ಇಲಾಖೆಯಿಂದ ಪಡೆದದ್ದು, 5 ವರ್ಷ ಮೀರದ ವ್ಯಾಲಿಡ್ ಪ್ರತಿ)</li>
              <li><strong>7. ವಿದ್ಯಾರ್ಥಿಯ ಆಧಾರ್ ಕಾರ್ಡ್ ಪ್ರತಿ</strong> (ಗುರುತಿನ ಪರಿಶೀಲನಾ ಚಿತ್ರ ದಾಖಲೆ)</li>
              <li><strong>8. ಪ್ರಸ್ತುತ ವರ್ಷದ ಕಾಲೇಜು ಶುಲ್ಕ ರಸೀದಿ</strong> (College Fee Paid Receipt)</li>
              <li><strong>9. ಪ್ರಾಂಶುಪಾಲರ ಪ್ರಮಾಣಪತ್ರ</strong> (ಇತರ ಆರ್ಥಿಕ ನೆರವು ಶುಲ್ಕದ 30% ಮೀರದ ದೃಢೀಕರಣ ಪತ್ರ)</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: 'print-pdf',
      q_en: '3. How do I print or save my submitted application PDF?',
      q_kn: '3. ಸಲ್ಲಿಸಿದ ಅರ್ಜಿಯ ಅಧಿಕೃತ ಪಿಡಿಎಫ್ ಅನ್ನು ಮುದ್ರಿಸುವುದು ಅಥವಾ ಡೌನ್‌ಲೋಡ್ ಮಾಡುವುದು ಹೇಗೆ?',
      a_en: (
        <div className="space-y-2">
          <p>
            Once your application is submitted, visit your <Link href="/dashboard" className="text-[#AC3D47] font-bold underline">Student Dashboard</Link>. Under &quot;My Applications&quot;, locate your application card and click <strong>&quot;Download PDF / Print&quot;</strong>.
          </p>
          <p>
            The generated PDF includes an official SIT header, application reference number, your embedded photo and signatures, merit calculations, and a verifiable <strong>cryptographic QR code</strong> for authenticity check. You can print this directly on standard A4 paper.
          </p>
        </div>
      ),
      a_kn: (
        <div className="space-y-2">
          <p>
            ಅರ್ಜಿ ಸಲ್ಲಿಕೆಯಾದ ನಂತರ, ನಿಮ್ಮ <Link href="/dashboard" className="text-[#AC3D47] font-bold underline">ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ</Link> ಹೋಗಿ. ಅಲ್ಲಿ &quot;ಡೌನ್‌ಲೋಡ್ ಪಿಡಿಎಫ್ / ಮುದ್ರಿಸಿ&quot; ಬಟನ್ ಕ್ಲಿಕ್ ಮಾಡಿ.
          </p>
          <p>
            ಡೌನ್‌ಲೋಡ್ ಆದ ಪಿಡಿಎಫ್‌ನಲ್ಲಿ ಅಧಿಕೃತ ರೆಫರೆನ್ಸ್ ಸಂಖ್ಯೆ, ಭಾವಚಿತ್ರ, ಸಹಿ, ಮತ್ತು ನೈಜತೆಯನ್ನು ಪರಿಶೀಲಿಸುವ ಕ್ಯೂಆರ್ (QR) ಕೋಡ್ ಒಳಗೊಂಡಿರುತ್ತದೆ.
          </p>
        </div>
      ),
    },
    {
      id: 'statuses',
      q_en: '4. What does each application status mean?',
      q_kn: '4. ಅರ್ಜಿಯ ಪ್ರತಿಯೊಂದು ಸ್ಥಿತಿಯ (Application Status) ಅರ್ಥವೇನು?',
      a_en: (
        <div className="space-y-2">
          <p>Your application progresses through clear scrutiny stages:</p>
          <div className="border border-gray-300 divide-y divide-gray-200">
            <div className="p-2 bg-white flex gap-2 items-start">
              <span className="font-mono font-bold text-gray-700 w-36 shrink-0">draft:</span>
              <span>Application has been saved by you but not yet submitted. You can freely edit and resume at any time.</span>
            </div>
            <div className="p-2 bg-blue-50 flex gap-2 items-start">
              <span className="font-mono font-bold text-blue-800 w-36 shrink-0">submitted:</span>
              <span>Application successfully received by the portal and queued for scrutiny.</span>
            </div>
            <div className="p-2 bg-indigo-50 flex gap-2 items-start">
              <span className="font-mono font-bold text-indigo-800 w-36 shrink-0">under_review:</span>
              <span>The Scrutiny Committee and department reviewers are examining your certificates and marks.</span>
            </div>
            <div className="p-2 bg-amber-50 flex gap-2 items-start">
              <span className="font-mono font-bold text-amber-800 w-36 shrink-0">correction_requested:</span>
              <span>The committee flagged an issue (e.g. illegible certificate or missing date). You may edit and resubmit.</span>
            </div>
            <div className="p-2 bg-purple-50 flex gap-2 items-start">
              <span className="font-mono font-bold text-purple-800 w-36 shrink-0">shortlisted:</span>
              <span>You have met preliminary merit and income criteria and are ranked on the candidate shortlist.</span>
            </div>
            <div className="p-2 bg-green-50 flex gap-2 items-start">
              <span className="font-mono font-bold text-green-800 w-36 shrink-0">accepted:</span>
              <span>Scholarship awarded! The award letter and disbursement instructions are approved.</span>
            </div>
            <div className="p-2 bg-red-50 flex gap-2 items-start">
              <span className="font-mono font-bold text-red-800 w-36 shrink-0">rejected:</span>
              <span>Application did not meet scheme requirements (e.g. income limit exceeded or backlogs detected).</span>
            </div>
            <div className="p-2 bg-gray-50 flex gap-2 items-start">
              <span className="font-mono font-bold text-gray-700 w-36 shrink-0">withdrawn:</span>
              <span>Application was withdrawn by the student.</span>
            </div>
          </div>
        </div>
      ),
      a_kn: (
        <div className="space-y-2">
          <p>ಅರ್ಜಿಯ ಪ್ರಮುಖ ಸ್ಥಿತಿಗಳು:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li><strong>draft:</strong> ಕರಡು ಪ್ರತಿ - ಇನ್ನೂ ಸಲ್ಲಿಸಿಲ್ಲ, ಬದಲಾವಣೆ ಮಾಡಬಹುದು.</li>
            <li><strong>submitted:</strong> ಯಶಸ್ವಿಯಾಗಿ ಸಲ್ಲಿಕೆಯಾಗಿದೆ.</li>
            <li><strong>under_review:</strong> ಸಮಿತಿಯ ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ.</li>
            <li><strong>correction_requested:</strong> ದಾಖಲೆ ಸರಿಪಡಿಸಲು ಕಾಲೇಜು ಸೂಚಿಸಿದೆ.</li>
            <li><strong>shortlisted:</strong> ಮೆರಿಟ್ ಆಧಾರದಲ್ಲಿ ಆಯ್ಕೆ ಪಟ್ಟಿಯಲ್ಲಿದೆ.</li>
            <li><strong>accepted:</strong> ವಿದ್ಯಾರ್ಥಿವೇತನ ಮಂಜೂರಾಗಿದೆ!</li>
            <li><strong>rejected:</strong> ನಿಯಮಾವಳಿಗಳಿಗೆ ಹೊಂದಾಣಿಕೆಯಾಗದ ಕಾರಣ ತಿರಸ್ಕರಿಸಲಾಗಿದೆ.</li>
            <li><strong>withdrawn:</strong> ವಿದ್ಯಾರ್ಥಿಯಿಂದ ಹಿಂಪಡೆಯಲಾಗಿದೆ.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'mistake',
      q_en: '5. What should I do if I made a mistake in my application?',
      q_kn: '5. ಅರ್ಜಿಯಲ್ಲಿ ತಪ್ಪು ನಮೂದಿಸಿದ್ದರೆ ಏನು ಮಾಡಬೇಕು?',
      a_en: (
        <div className="space-y-2">
          <p>
            • <strong>If still in Draft:</strong> You can edit any field or replace uploaded files directly before final submission.
          </p>
          <p>
            • <strong>If already Submitted:</strong> Applications cannot be modified directly while under review to preserve scrutiny integrity. However, if the scrutiny committee notices discrepancies, they will mark your application as <strong>&quot;Correction Requested&quot;</strong> with an explanation note, which immediately unlocks your form for editing and resubmission.
          </p>
          <p>
            • <strong>Urgent Corrections:</strong> If you discovered a critical mistake after submitting, contact the Scholarship Helpdesk in person at the Administrative Block with your reference number.
          </p>
        </div>
      ),
      a_kn: (
        <div className="space-y-2">
          <p>• <strong>ಕರಡು (Draft) ಹಂತದಲ್ಲಿದ್ದರೆ:</strong> ನೀವೇ ನೇರವಾಗಿ ತಿದ್ದುಪಡಿ ಮಾಡಬಹುದು.</p>
          <p>• <strong>ಈಗಾಗಲೇ ಸಲ್ಲಿಕೆಯಾಗಿದ್ದರೆ:</strong> ಸಮಿತಿಯು ಪರಿಶೀಲಿಸಿ &quot;Correction Requested&quot; ನೀಡಿದರೆ ಮತ್ತೆ ಸರಿಪಡಿಸಿ ಸಲ್ಲಿಸಬಹುದು. ತುರ್ತು ತಿದ್ದುಪಡಿ ಇದ್ದಲ್ಲಿ ಲೆಕ್ಕಪತ್ರ ವಿಭಾಗವನ್ನು ಭೇಟಿ ಮಾಡಿ.</p>
        </div>
      ),
    },
    {
      id: 'forgot-password',
      q_en: '6. How do I reset my account password?',
      q_kn: '6. ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿದ್ದರೆ ಅದನ್ನು ಮರುಹೊಂದಿಸುವುದು ಹೇಗೆ?',
      a_en: (
        <div className="space-y-2">
          <p>
            On the <Link href="/login" className="text-[#AC3D47] font-bold underline">Login page</Link>, click <strong>&quot;Forgot Password?&quot;</strong>. Enter your registered SIT email address. A secure, single-use password reset link will be dispatched to your inbox. Click the link and enter your new password.
          </p>
        </div>
      ),
      a_kn: (
        <p>
          ಲಾಗಿನ್ ಪುಟದಲ್ಲಿರುವ &quot;ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?&quot; ಲಿಂಕ್ ಕ್ಲಿಕ್ ಮಾಡಿ. ನಿಮ್ಮ ನೋಂದಾಯಿತ ಇಮೇಲ್ ವಿಳಾಸವನ್ನು ನಮೂದಿಸಿ. ನಿಮ್ಮ ಇಮೇಲ್‌ಗೆ ಬರುವ ರಹಸ್ಯ ಲಿಂಕ್ ಮೂಲಕ ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಹೊಂದಿಸಿ.
        </p>
      ),
    },
    {
      id: 'email-not-arrived',
      q_en: '7. What should I do if the verification email does not arrive?',
      q_kn: '7. ಇಮೇಲ್ ಪರಿಶೀಲನಾ ಸಂದೇಶ ಬರದಿದ್ದರೆ ಏನು ಮಾಡಬೇಕು?',
      a_en: (
        <div className="space-y-2">
          <p>Follow these quick diagnostic steps:</p>
          <ol className="list-decimal list-inside space-y-1 pl-1">
            <li><strong>Check Spam/Junk:</strong> Automated emails can occasionally be routed to your Spam or Updates folders.</li>
            <li><strong>Verify Email Domain:</strong> Ensure you registered with your valid official SIT address (<code className="bg-gray-100 px-1">@sit.ac.in</code>).</li>
            <li><strong>Use Resend Button:</strong> On the Login page, enter your email and click <strong>&quot;Resend confirmation email&quot;</strong>.</li>
            <li><strong>Wait a few minutes:</strong> Institutional mail servers may experience brief delivery queues.</li>
          </ol>
        </div>
      ),
      a_kn: (
        <div className="space-y-2">
          <p>ಕೆಳಗಿನ ಹಂತಗಳನ್ನು ಅನುಸರಿಸಿ:</p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>ನಿಮ್ಮ ಇಮೇಲ್‌ನ Spam ಅಥವಾ Junk ಫೋಲ್ಡರ್ ಪರಿಶೀಲಿಸಿ.</li>
            <li>ಇಮೇಲ್ ಕಾಗುಣಿತ ಸರಿಯಾಗಿದೆಯೇ ಮತ್ತು @sit.ac.in ವಿಳಾಸವೇ ಎಂಬುದನ್ನು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.</li>
            <li>ಲಾಗಿನ್ ಪುಟದಲ್ಲಿ &quot;Resend confirmation email&quot; ಬಟನ್ ಒತ್ತಿ.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'contact',
      q_en: '8. Whom should I contact for further assistance or queries?',
      q_kn: '8. ಹೆಚ್ಚಿನ ಸಹಾಯಕ್ಕಾಗಿ ಯಾರನ್ನು ಸಂಪರ್ಕಿಸಬೇಕು?',
      a_en: (
        <div className="space-y-2">
          <p>For application guidance or technical issues, reach out to:</p>
          <div className="border border-gray-300 bg-gray-50 p-3 leading-relaxed font-mono text-xs">
            <div className="font-bold text-gray-900 font-sans">SIT Scholarship Helpdesk & Accounts Section</div>
            <div>Location: Administrative Block, Ground Floor, SIT Tumakuru</div>
            <div>Office Hours: Monday – Saturday, 9:30 AM to 5:00 PM</div>
            <div>Email: <a href="mailto:scholarships@sit.ac.in" className="text-[#AC3D47] underline">scholarships@sit.ac.in</a></div>
            <div>Phone: 0816-2214000 / 0816-2214002</div>
          </div>
        </div>
      ),
      a_kn: (
        <div className="space-y-2">
          <p>ಹೆಚ್ಚಿನ ಮಾಹಿತಿ ಮತ್ತು ತಾಂತ್ರಿಕ ನೆರವಿಗಾಗಿ:</p>
          <div className="border border-gray-300 bg-gray-50 p-3 leading-relaxed text-xs">
            <div className="font-bold text-gray-900">ವಿದ್ಯಾರ್ಥಿವೇತನ ಸಹಾಯವಾಣಿ ಮತ್ತು ಲೆಕ್ಕಪತ್ರ ವಿಭಾಗ</div>
            <div>ಸ್ಥಳ: ಆಡಳಿತ ಕಚೇರಿ, ನೆಲ ಮಹಡಿ, ಎಸ್.ಐ.ಟಿ ತುಮಕೂರು</div>
            <div>ಕಚೇರಿ ಸಮಯ: ಸೋಮವಾರ – ಶನಿವಾರ, ಬೆಳಿಗ್ಗೆ 9:30 ರಿಂದ ಸಂಜೆ 5:00</div>
            <div>ಇಮೇಲ್: scholarships@sit.ac.in | ದೂರವಾಣಿ: 0816-2214000</div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="gov-card p-6 sm:p-8 border-gray-300">
        
        {/* Header */}
        <div className="border-b border-gray-300 pb-5 mb-6">
          <div className="text-xs font-bold uppercase tracking-widest text-gray-500">
            Siddaganga Institute of Technology, Tumakuru
          </div>
          <h1 className="text-2xl font-bold text-[#AC3D47] mt-1">
            {lang === 'kn' ? 'ಸಾಮಾನ್ಯ ಪ್ರಶ್ನೆಗಳು (FAQ)' : 'Frequently Asked Questions (FAQ)'}
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            {lang === 'kn'
              ? 'ಅರ್ಜಿ ಸಲ್ಲಿಕೆ, ದಾಖಲೆಗಳು, ಮತ್ತು ಪರಿಶೀಲನೆಗೆ ಸಂಬಂಧಿಸಿದ ಸಾಮಾನ್ಯ ಸಂದೇಹಗಳಿಗೆ ಅಧಿಕೃತ ಉತ್ತರಗಳು'
              : 'Official Guidance on Application Steps, Required Certificates, PDF Generation, and Committee Scrutiny'}
          </p>
          {lang === 'kn' && (
            <div className="mt-2 inline-block bg-amber-50 border border-amber-300 px-2 py-0.5 text-[11px] font-mono text-amber-800">
              TODO: review by college (ಕಾಲೇಜು ಆಡಳಿತ ಮಂಡಳಿಯಿಂದ ಕನ್ನಡ ಪರಿಶೀಲನೆ ಬಾಕಿ ಇದೆ)
            </div>
          )}
        </div>

        {/* Accordion / List */}
        <div className="space-y-3">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div key={faq.id} className="border border-gray-300 bg-white">
                <button
                  type="button"
                  onClick={() => toggle(faq.id)}
                  className="w-full text-left px-4 py-3 bg-[#F8FAFC] hover:bg-gray-100 flex items-center justify-between transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-xs font-bold text-[#AC3D47]">
                    {lang === 'kn' ? faq.q_kn : faq.q_en}
                  </span>
                  <span className="font-mono text-xs font-bold text-gray-500 ml-2">
                    {isOpen ? '—' : '+'}
                  </span>
                </button>
                {isOpen && (
                  <div className="p-4 border-t border-gray-200 text-xs text-gray-800 bg-white leading-relaxed">
                    {lang === 'kn' ? faq.a_kn : faq.a_en}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 border-t border-gray-200 pt-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <Link href="/terms" className="text-[#AC3D47] font-bold hover:underline">
            ← {lang === 'kn' ? 'ಬಳಕೆಯ ನಿಯಮಗಳು (Terms of Use)' : 'Terms of Use'}
          </Link>
          <Link href="/accessibility" className="text-[#AC3D47] font-bold hover:underline">
            {lang === 'kn' ? 'ಪ್ರವೇಶಸಾಧ್ಯತೆ ಹೇಳಿಕೆ (Accessibility) →' : 'Accessibility Statement →'}
          </Link>
        </div>

      </div>
    </div>
  );
}
