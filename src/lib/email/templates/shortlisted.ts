import { EmailRenderInput, RenderedEmail } from '../types';
import { wrapGovEmailHtml } from './layout';

export function renderShortlistedEmail(input: EmailRenderInput): RenderedEmail {
  const portalUrl = input.portalUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://scholarships.sit.ac.in';
  const schemeName = input.scholarshipName || 'Institutional Scholarship';

  const subject = `Status Update: Shortlisted for Award - Ref: ${input.refNo} | SIT Scholarships`;

  const text = `Siddaganga Institute of Technology, Tumakuru
Scholarship Application Portal

Dear ${input.studentName},

We are pleased to inform you that based on verified academic merit and family income criteria, your application (${input.refNo}) has been shortlisted by the Scrutiny Committee for "${schemeName}".

Application Reference Number: ${input.refNo}

Next Steps:
- The committee will finalize sanction approvals per branch and year quotas.
- Please ensure your physical files and revenue documents are ready in case of interview verification.
- You can monitor progress on your portal dashboard at ${portalUrl}/dashboard.

Regards,
College Scholarship Committee
Siddaganga Institute of Technology, Tumakuru – 572103

--------------------------------------------------
TODO: review by college (ಕನ್ನಡ ಅನುವಾದ):
ಆತ್ಮೀಯ ${input.studentName},
ಶೈಕ್ಷಣಿಕ ಮೆರಿಟ್ ಮತ್ತು ಆದಾಯ ಅರ್ಹತೆಯ ಆಧಾರದ ಮೇಲೆ ನಿಮ್ಮ ಅರ್ಜಿಯು (ರೆಫರೆನ್ಸ್: ${input.refNo}) "${schemeName}" ಪ್ರಶಸ್ತಿ ಪಟ್ಟಿಗೆ ಆಯ್ಕೆಯಾಗಿದೆ.
ಅಂತಿಮ ಅನುಮೋದನೆಗಳಿಗಾಗಿ ನಿಮ್ಮ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ (${portalUrl}/dashboard) ಗಮನಿಸುತ್ತಿರಿ.
`;

  const enHtml = `
    <h2 style="font-size: 16px; font-weight: 700; color: #1e3a8a; margin: 0 0 12px 0;">Application Shortlisted for Award</h2>
    <p>Dear <strong>${input.studentName}</strong>,</p>
    <p>Congratulations! Following academic scrutiny and verification of income criteria, your application for <strong>${schemeName}</strong> has been <strong>shortlisted</strong> for final sanction consideration.</p>
    <div style="background-color: #eff6ff; border-left: 3px solid #1e3a8a; padding: 12px 16px; margin: 16px 0; font-family: monospace; font-size: 13px;">
      <strong>Application Reference Number:</strong> ${input.refNo}
    </div>
    <p>Final award approvals are processed in accordance with departmental quotas and committee recommendations. You can check updates on your portal dashboard:</p>
    <p style="margin: 20px 0;">
      <a href="${portalUrl}/dashboard" style="background-color: #1e3a8a; color: #ffffff; padding: 10px 18px; text-decoration: none; font-weight: 700; display: inline-block;">
        View Status on Dashboard →
      </a>
    </p>
  `;

  const knHtml = `
    <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 8px 0;">ಅರ್ಜಿ ಮೆರಿಟ್ ಪಟ್ಟಿಗೆ ಆಯ್ಕೆಯಾಗಿದೆ</h3>
    <p>ಆತ್ಮೀಯ <strong>${input.studentName}</strong>,</p>
    <p><strong>${schemeName}</strong> ಗಾಗಿ ನಿಮ್ಮ ಅರ್ಜಿಯನ್ನು (ಸಂಖ್ಯೆ: <strong>${input.refNo}</strong>) ಸಮಿತಿಯು ಶಾರ್ಟ್‌ಲಿಸ್ಟ್ ಮಾಡಿದೆ.</p>
  `;

  return {
    subject,
    text,
    html: wrapGovEmailHtml('Application Shortlisted', enHtml, knHtml),
  };
}
