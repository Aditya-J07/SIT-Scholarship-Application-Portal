import { EmailRenderInput, RenderedEmail } from '../types';
import { wrapGovEmailHtml } from './layout';

export function renderCorrectionRequestedEmail(input: EmailRenderInput): RenderedEmail {
  const portalUrl = input.portalUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://scholarships.sit.ac.in';
  const schemeName = input.scholarshipName || 'Institutional Scholarship';
  const remark = input.remark || 'Please review your uploaded certificates and details.';

  const subject = `Action Required: Correction Requested - Ref: ${input.refNo} | SIT Scholarships`;

  const text = `Siddaganga Institute of Technology, Tumakuru
Scholarship Application Portal

Dear ${input.studentName},

The Scrutiny Committee has reviewed your application (${input.refNo}) for "${schemeName}" and requested corrections before it can proceed further.

Committee Instructions:
"${remark}"

What You Need to Do:
1. Log in to your portal dashboard at ${portalUrl}/dashboard.
2. Click "Edit & Resubmit" on your application card.
3. Update the flagged details or re-upload clear certificate copies.
4. Resubmit the application before the scrutiny cycle closes.

Regards,
Scholarship Scrutiny Committee
Siddaganga Institute of Technology, Tumakuru – 572103

--------------------------------------------------
TODO: review by college (ಕನ್ನಡ ಅನುವಾದ):
ಆತ್ಮೀಯ ${input.studentName},
"${schemeName}" ಗಾಗಿ ನಿಮ್ಮ ಅರ್ಜಿಯಲ್ಲಿ (ರೆಫರೆನ್ಸ್ ಸಂಖ್ಯೆ: ${input.refNo}) ತಿದ್ದುಪಡಿಗಳನ್ನು ಸೂಚಿಸಲಾಗಿದೆ.
ಸಮಿತಿಯ ಸೂಚನೆ: "${remark}"
ದಯವಿಟ್ಟು ಪೋರ್ಟಲ್‌ಗೆ ಲಾಗಿನ್ ಆಗಿ (${portalUrl}/dashboard) ದಾಖಲೆಗಳನ್ನು ಸರಿಪಡಿಸಿ ಮರುಸಲ್ಲಿಸಿ.
`;

  const enHtml = `
    <h2 style="font-size: 16px; font-weight: 700; color: #b45309; margin: 0 0 12px 0;">Action Required: Correction Requested</h2>
    <p>Dear <strong>${input.studentName}</strong>,</p>
    <p>The Scrutiny Committee has reviewed your application for <strong>${schemeName}</strong> (Ref: <strong>${input.refNo}</strong>) and requires clarifications or replacement certificates.</p>
    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #b45309; padding: 14px 18px; margin: 16px 0;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #92400e; margin-bottom: 4px;">Reviewer Instructions:</div>
      <div style="font-size: 13px; color: #78350f; font-weight: 500;">"${remark}"</div>
    </div>
    <p>Your application is now unlocked for corrections. Please review and resubmit promptly:</p>
    <p style="margin: 20px 0;">
      <a href="${portalUrl}/dashboard" style="background-color: #b45309; color: #ffffff; padding: 10px 18px; text-decoration: none; font-weight: 700; display: inline-block;">
        Edit & Resubmit Application →
      </a>
    </p>
  `;

  const knHtml = `
    <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 8px 0;">ಅರ್ಜಿಯಲ್ಲಿ ತಿದ್ದುಪಡಿ ಅಗತ್ಯವಿದೆ</h3>
    <p>ಆತ್ಮೀಯ <strong>${input.studentName}</strong>,</p>
    <p>ಅರ್ಜಿ ಸಂಖ್ಯೆ <strong>${input.refNo}</strong> ಪರಿಶೀಲಿಸಲಾಗಿದ್ದು, ಈ ಕೆಳಗಿನ ವಿವರಗಳನ್ನು ಸರಿಪಡಿಸಲು ಕೋರಲಾಗಿದೆ:</p>
    <p><em>"${remark}"</em></p>
    <p>ದಯವಿಟ್ಟು ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ತಿದ್ದುಪಡಿ ಮಾಡಿ ಮರುಸಲ್ಲಿಸಿ.</p>
  `;

  return {
    subject,
    text,
    html: wrapGovEmailHtml('Correction Requested', enHtml, knHtml),
  };
}
