import { EmailRenderInput, RenderedEmail } from '../types';
import { wrapGovEmailHtml } from './layout';

export function renderDeadlineReminderEmail(input: EmailRenderInput): RenderedEmail {
  const portalUrl = input.portalUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://scholarships.sit.ac.in';
  const schemeName = input.scholarshipName || 'Institutional Scholarship';
  const deadlineStr = input.deadlineDate || 'soon';

  const subject = `Deadline Approaching - Ref: ${input.refNo} | SIT Scholarships`;

  const text = `Siddaganga Institute of Technology, Tumakuru
Scholarship Application Portal

Dear ${input.studentName},

This is an urgent reminder that the application deadline for "${schemeName}" is closing on ${deadlineStr}.

Application Reference: ${input.refNo}

- Your application is currently saved in DRAFT or pending submission.
- Complete all required sections and upload all mandatory certificates before the deadline.
- Unsubmitted drafts will be automatically locked once the cycle closes.

Portal Link: ${portalUrl}/apply
Student Dashboard: ${portalUrl}/dashboard

Regards,
Scholarship Administration
Siddaganga Institute of Technology, Tumakuru – 572103

--------------------------------------------------
TODO: review by college (ಕನ್ನಡ ಅನುವಾದ):
ಆತ್ಮೀಯ ${input.studentName},
"${schemeName}" ಗಾಗಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಕೊನೆಯ ದಿನಾಂಕ (${deadlineStr}) ಹತ್ತಿರವಾಗುತ್ತಿದೆ.
ಅರ್ಜಿ ರೆಫರೆನ್ಸ್ ಸಂಖ್ಯೆ: ${input.refNo}
ಅಂತಿಮ ದಿನಾಂಕದೊಳಗೆ ನಿಮ್ಮ ಅರ್ಜಿಯನ್ನು ಸಲ್ಲಿಸಲು ವಿನಂತಿ.
`;

  const enHtml = `
    <h2 style="font-size: 16px; font-weight: 700; color: #b45309; margin: 0 0 12px 0;">Urgent: Scholarship Application Deadline Approaching</h2>
    <p>Dear <strong>${input.studentName}</strong>,</p>
    <p>This is a reminder that the application portal for <strong>${schemeName}</strong> is scheduled to close on <strong>${deadlineStr}</strong>.</p>
    <div style="background-color: #fffbeb; border-left: 3px solid #b45309; padding: 12px 16px; margin: 16px 0; font-family: monospace; font-size: 13px;">
      <strong>Draft Application Reference:</strong> ${input.refNo}
    </div>
    <p>Please log in and ensure all mandatory documents are uploaded and your declaration accepted before the window closes:</p>
    <p style="margin: 20px 0;">
      <a href="${portalUrl}/dashboard" style="background-color: #b45309; color: #ffffff; padding: 10px 18px; text-decoration: none; font-weight: 700; display: inline-block;">
        Complete & Submit Application →
      </a>
    </p>
  `;

  const knHtml = `
    <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 8px 0;">ಅರ್ಜಿ ಸಲ್ಲಿಕೆಗೆ ಅಂತಿಮ ಗಡುವು ಸಮೀಪಿಸಿದೆ</h3>
    <p>ಆತ್ಮೀಯ <strong>${input.studentName}</strong>,</p>
    <p><strong>${schemeName}</strong> ಗಾಗಿ ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಕೊನೆಯ ದಿನಾಂಕ: <strong>${deadlineStr}</strong></p>
    <p>ಅರ್ಜಿ ಸಂಖ್ಯೆ: ${input.refNo}</p>
  `;

  return {
    subject,
    text,
    html: wrapGovEmailHtml('Scholarship Deadline Approaching', enHtml, knHtml),
  };
}
