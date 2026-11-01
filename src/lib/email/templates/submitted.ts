import { EmailRenderInput, RenderedEmail } from '../types';
import { wrapGovEmailHtml } from './layout';

export function renderSubmittedEmail(input: EmailRenderInput): RenderedEmail {
  const portalUrl = input.portalUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://scholarships.sit.ac.in';
  const schemeName = input.scholarshipName || 'Institutional Scholarship';

  const subject = `Application Submitted - Ref: ${input.refNo} | SIT Scholarships`;

  const text = `Siddaganga Institute of Technology, Tumakuru
Scholarship Application Portal

Dear ${input.studentName},

Your application for "${schemeName}" has been successfully submitted.

Application Reference Number: ${input.refNo}

Next Steps:
- The College Scrutiny Committee will review your eligibility and verified enclosures.
- You can log in to the portal at ${portalUrl}/dashboard to track scrutiny status and download your digitally signed PDF form.
- If physical document submission is requested, submit the signed PDF printout with attested certificate copies to the Accounts Section.

Regards,
Scholarship Scrutiny Committee
Siddaganga Institute of Technology, Tumakuru – 572103

--------------------------------------------------
TODO: review by college (ಕನ್ನಡ ಅನುವಾದ):
ಆತ್ಮೀಯ ${input.studentName},
"${schemeName}" ಗಾಗಿ ನಿಮ್ಮ ವಿದ್ಯಾರ್ಥಿವೇತನ ಅರ್ಜಿಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಸಲ್ಲಿಸಲಾಗಿದೆ.
ಅರ್ಜಿ ರೆಫರೆನ್ಸ್ ಸಂಖ್ಯೆ: ${input.refNo}
ನಿಮ್ಮ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ (${portalUrl}/dashboard) ಮೂಲಕ ಅರ್ಜಿಯ ಪರಿಶೀಲನಾ ಸ್ಥಿತಿಯನ್ನು ವೀಕ್ಷಿಸಬಹುದು.
`;

  const enHtml = `
    <h2 style="font-size: 16px; font-weight: 700; color: #AC3D47; margin: 0 0 12px 0;">Application Submitted Successfully</h2>
    <p>Dear <strong>${input.studentName}</strong>,</p>
    <p>Your online application for <strong>${schemeName}</strong> has been received by the portal.</p>
    <div style="background-color: #f1f5f9; border-left: 3px solid #AC3D47; padding: 12px 16px; margin: 16px 0; font-family: monospace; font-size: 13px;">
      <strong>Application Reference Number:</strong> ${input.refNo}
    </div>
    <p>You can track the progress of your application and download your print-ready PDF form at any time from your student dashboard:</p>
    <p style="margin: 20px 0;">
      <a href="${portalUrl}/dashboard" style="background-color: #AC3D47; color: #ffffff; padding: 10px 18px; text-decoration: none; font-weight: 700; display: inline-block;">
        Open Student Dashboard →
      </a>
    </p>
  `;

  const knHtml = `
    <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 8px 0;">ಅರ್ಜಿ ಸಲ್ಲಿಕೆ ಯಶಸ್ವಿಯಾಗಿದೆ</h3>
    <p>ಆತ್ಮೀಯ <strong>${input.studentName}</strong>,</p>
    <p><strong>${schemeName}</strong> ಗಾಗಿ ನಿಮ್ಮ ವಿದ್ಯಾರ್ಥಿವೇತನ ಅರ್ಜಿಯು ಯಶಸ್ವಿಯಾಗಿ ಸ್ವೀಕರಿಸಲ್ಪಟ್ಟಿದೆ.</p>
    <p>ಅರ್ಜಿ ಸಂಖ್ಯೆ: <strong>${input.refNo}</strong></p>
    <p>ಕಾಲೇಜು ಸಮಿತಿಯು ನಿಮ್ಮ ದಾಖಲೆಗಳನ್ನು ಶೀಘ್ರದಲ್ಲೇ ಪರಿಶೀಲಿಸಲಿದೆ.</p>
  `;

  return {
    subject,
    text,
    html: wrapGovEmailHtml('Application Submitted', enHtml, knHtml),
  };
}
