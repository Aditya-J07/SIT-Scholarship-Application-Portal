import { EmailRenderInput, RenderedEmail } from '../types';
import { wrapGovEmailHtml } from './layout';

export function renderAcceptedEmail(input: EmailRenderInput): RenderedEmail {
  const portalUrl = input.portalUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://scholarships.sit.ac.in';
  const schemeName = input.scholarshipName || 'Institutional Scholarship';
  const remark = input.remark || 'Scholarship sanctioned as per institutional regulations.';

  const subject = `Official Decision: Scholarship Sanctioned - Ref: ${input.refNo} | SIT Scholarships`;

  const text = `Siddaganga Institute of Technology, Tumakuru
Scholarship Application Portal

Dear ${input.studentName},

Congratulations! We are pleased to formally notify you that your scholarship application (${input.refNo}) for "${schemeName}" has been APPROVED and SANCTIONED by the College Scholarship Committee and Governing Council.

Sanction Note:
${remark}

Disbursement Instructions:
- The sanctioned financial aid will be processed via direct institutional disbursement / bank transfer to your verified savings account.
- You can log in to ${portalUrl}/dashboard to download your official Award Sanction Certificate.

Regards,
Accounts Section & Scholarship Cell
Siddaganga Institute of Technology, Tumakuru – 572103

--------------------------------------------------
TODO: review by college (ಕನ್ನಡ ಅನುವಾದ):
ಆತ್ಮೀಯ ${input.studentName},
ಅಭಿನಂದನೆಗಳು! "${schemeName}" ಗಾಗಿ ನಿಮ್ಮ ಅರ್ಜಿ (ರೆಫರೆನ್ಸ್ ಸಂಖ್ಯೆ: ${input.refNo}) ಕಾಲೇಜು ಸಮಿತಿಯಿಂದ ಮಂಜೂರಾಗಿದೆ (Approved).
ವಿವರಗಳನ್ನು ನಿಮ್ಮ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ನಲ್ಲಿ (${portalUrl}/dashboard) ಪರಿಶೀಲಿಸಿ.
`;

  const enHtml = `
    <h2 style="font-size: 16px; font-weight: 700; color: #15803d; margin: 0 0 12px 0;">Official Sanction: Scholarship Approved</h2>
    <p>Dear <strong>${input.studentName}</strong>,</p>
    <p>Congratulations! We are delighted to inform you that your application for <strong>${schemeName}</strong> (Ref: <strong>${input.refNo}</strong>) has been <strong>approved and sanctioned</strong> by the College Governing Council.</p>
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #15803d; padding: 14px 18px; margin: 16px 0;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #166534; margin-bottom: 4px;">Sanction Order Details:</div>
      <div style="font-size: 13px; color: #14532d; font-weight: 500;">${remark}</div>
    </div>
    <p>Disbursement to your registered bank account will be executed as per institutional schedules. You may download your formal award letter from your dashboard:</p>
    <p style="margin: 20px 0;">
      <a href="${portalUrl}/dashboard" style="background-color: #15803d; color: #ffffff; padding: 10px 18px; text-decoration: none; font-weight: 700; display: inline-block;">
        Download Award Certificate →
      </a>
    </p>
  `;

  const knHtml = `
    <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 8px 0;">ವಿದ್ಯಾರ್ಥಿವೇತನ ಮಂಜೂರಾತಿ ಆದೇಶ</h3>
    <p>ಆತ್ಮೀಯ <strong>${input.studentName}</strong>,</p>
    <p>ಅಭಿನಂದನೆಗಳು! <strong>${schemeName}</strong> ಯೋಜನೆಗಾಗಿ ನಿಮ್ಮ ಅರ್ಜಿಯು (ಸಂಖ್ಯೆ: <strong>${input.refNo}</strong>) ಮಂಜೂರಾಗಿದೆ.</p>
    <p>ವಿವರ: ${remark}</p>
  `;

  return {
    subject,
    text,
    html: wrapGovEmailHtml('Scholarship Sanction Approved', enHtml, knHtml),
  };
}
