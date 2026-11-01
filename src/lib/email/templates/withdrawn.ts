import { EmailRenderInput, RenderedEmail } from '../types';
import { wrapGovEmailHtml } from './layout';

export function renderWithdrawnEmail(input: EmailRenderInput): RenderedEmail {
  const portalUrl = input.portalUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://scholarships.sit.ac.in';
  const schemeName = input.scholarshipName || 'Institutional Scholarship';

  const subject = `Application Withdrawn - Ref: ${input.refNo} | SIT Scholarships`;

  const text = `Siddaganga Institute of Technology, Tumakuru
Scholarship Application Portal

Dear ${input.studentName},

This is an official confirmation that your application (${input.refNo}) for "${schemeName}" has been successfully WITHDRAWN as requested.

Reference Number: ${input.refNo}

- Your application will no longer be considered for scrutiny or award in this cycle.
- If this withdrawal was made in error or without your authorization, please contact the Scholarship Helpdesk immediately.

Regards,
Scholarship Administration
Siddaganga Institute of Technology, Tumakuru – 572103

--------------------------------------------------
TODO: review by college (ಕನ್ನಡ ಅನುವಾದ):
ಆತ್ಮೀಯ ${input.studentName},
"${schemeName}" ಗಾಗಿ ಸಲ್ಲಿಸಲಾದ ನಿಮ್ಮ ಅರ್ಜಿಯನ್ನು (ರೆಫರೆನ್ಸ್: ${input.refNo}) ನಿಮ್ಮ ಕೋರಿಕೆಯಂತೆ ಹಿಂಪಡೆಯಲಾಗಿದೆ (Withdrawn).
`;

  const enHtml = `
    <h2 style="font-size: 16px; font-weight: 700; color: #475569; margin: 0 0 12px 0;">Application Withdrawn</h2>
    <p>Dear <strong>${input.studentName}</strong>,</p>
    <p>This message confirms that your application for <strong>${schemeName}</strong> (Ref: <strong>${input.refNo}</strong>) has been <strong>withdrawn</strong> from the current cycle.</p>
    <div style="background-color: #f8fafc; border-left: 3px solid #64748b; padding: 12px 16px; margin: 16px 0; font-family: monospace; font-size: 13px;">
      <strong>Application Reference Number:</strong> ${input.refNo}
    </div>
    <p>If you did not initiate this withdrawal, please contact the Scholarship Helpdesk immediately.</p>
    <p style="margin: 20px 0;">
      <a href="${portalUrl}/dashboard" style="background-color: #475569; color: #ffffff; padding: 10px 18px; text-decoration: none; font-weight: 700; display: inline-block;">
        Visit Portal Dashboard →
      </a>
    </p>
  `;

  const knHtml = `
    <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 8px 0;">ಅರ್ಜಿ ಹಿಂಪಡೆಯಲಾಗಿದೆ</h3>
    <p>ಆತ್ಮೀಯ <strong>${input.studentName}</strong>,</p>
    <p>ನಿಮ್ಮ ಕೋರಿಕೆಯಂತೆ ಅರ್ಜಿ ಸಂಖ್ಯೆ <strong>${input.refNo}</strong> ಅನ್ನು ಹಿಂಪಡೆಯಲಾಗಿದೆ.</p>
  `;

  return {
    subject,
    text,
    html: wrapGovEmailHtml('Application Withdrawn', enHtml, knHtml),
  };
}
