import { EmailRenderInput, RenderedEmail } from '../types';
import { wrapGovEmailHtml } from './layout';

export function renderRejectedEmail(input: EmailRenderInput): RenderedEmail {
  const portalUrl = input.portalUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://scholarships.sit.ac.in';
  const schemeName = input.scholarshipName || 'Institutional Scholarship';
  const remark = input.remark || 'Application did not meet scheme rules or annual quota filled by higher academic merit.';

  const subject = `Status Update: Scholarship Decision - Ref: ${input.refNo} | SIT Scholarships`;

  const text = `Siddaganga Institute of Technology, Tumakuru
Scholarship Application Portal

Dear ${input.studentName},

Your application (${input.refNo}) for "${schemeName}" has been evaluated by the College Scrutiny Committee. Regrettably, your application could not be selected for an award in this academic cycle.

Decision Reason:
${remark}

We commend your academic effort and encourage you to apply for other institutional or state welfare scholarships in upcoming cycles.

Regards,
Scholarship Scrutiny Committee
Siddaganga Institute of Technology, Tumakuru – 572103

--------------------------------------------------
TODO: review by college (ಕನ್ನಡ ಅನುವಾದ):
ಆತ್ಮೀಯ ${input.studentName},
"${schemeName}" ಗಾಗಿ ಸಲ್ಲಿಸಲಾದ ನಿಮ್ಮ ಅರ್ಜಿಯನ್ನು (ರೆಫರೆನ್ಸ್ ಸಂಖ್ಯೆ: ${input.refNo}) ಪರಿಶೀಲಿಸಲಾಗಿದ್ದು, ಈ ಶೈಕ್ಷಣಿಕ ಸಾಲಿನಲ್ಲಿ ಆಯ್ಕೆ ಮಾಡಲು ಸಾಧ್ಯವಾಗಿಲ್ಲ.
ಕಾರಣ: ${remark}
`;

  const enHtml = `
    <h2 style="font-size: 16px; font-weight: 700; color: #b91c1c; margin: 0 0 12px 0;">Status Update: Scholarship Decision</h2>
    <p>Dear <strong>${input.studentName}</strong>,</p>
    <p>Your application for <strong>${schemeName}</strong> (Ref: <strong>${input.refNo}</strong>) has been reviewed by the Scrutiny Committee. Regrettably, your application could not be selected for sanction in this cycle.</p>
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #b91c1c; padding: 14px 18px; margin: 16px 0;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #991b1b; margin-bottom: 4px;">Committee Observation:</div>
      <div style="font-size: 13px; color: #7f1d1d; font-weight: 500;">${remark}</div>
    </div>
    <p>You can view your archived application details on your dashboard:</p>
    <p style="margin: 20px 0;">
      <a href="${portalUrl}/dashboard" style="background-color: #475569; color: #ffffff; padding: 10px 18px; text-decoration: none; font-weight: 700; display: inline-block;">
        View Application Archive →
      </a>
    </p>
  `;

  const knHtml = `
    <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 8px 0;">ಅರ್ಜಿ ಪರಿಶೀಲನಾ ವರದಿ</h3>
    <p>ಆತ್ಮೀಯ <strong>${input.studentName}</strong>,</p>
    <p>ನಿಮ್ಮ ಅರ್ಜಿಯನ್ನು (ಸಂಖ್ಯೆ: <strong>${input.refNo}</strong>) ಈ ಸಾಲಿನಲ್ಲಿ ಆಯ್ಕೆ ಮಾಡಲು ಸಾಧ್ಯವಾಗಿಲ್ಲ.</p>
    <p>ಕಾರಣ: ${remark}</p>
  `;

  return {
    subject,
    text,
    html: wrapGovEmailHtml('Scholarship Decision Update', enHtml, knHtml),
  };
}
