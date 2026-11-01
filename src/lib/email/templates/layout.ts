export function wrapGovEmailHtml(title: string, enContentHtml: string, knContentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #cbd5e1; border-top: 4px solid #AC3D47;">
    <!-- College Header -->
    <tr>
      <td style="padding: 24px 28px; border-bottom: 1px solid #e2e8f0; background-color: #ffffff;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">
          Siddaganga Institute of Technology, Tumakuru – 572103
        </div>
        <div style="font-size: 18px; font-weight: 700; color: #AC3D47; margin-top: 4px;">
          Scholarship Application Portal
        </div>
      </td>
    </tr>
    <!-- English Section -->
    <tr>
      <td style="padding: 24px 28px; font-size: 13px; line-height: 1.6; color: #0f172a;">
        ${enContentHtml}
      </td>
    </tr>
    <!-- Kannada Translation Section -->
    <tr>
      <td style="padding: 20px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; line-height: 1.6; color: #334155;">
        <div style="font-size: 10px; font-weight: 700; color: #854d0e; background-color: #fef9c3; display: inline-block; padding: 2px 6px; margin-bottom: 8px;">
          TODO: review by college (ಕನ್ನಡ ಅನುವಾದ)
        </div>
        ${knContentHtml}
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding: 20px 28px; border-top: 1px solid #e2e8f0; font-size: 11px; line-height: 1.5; color: #64748b; background-color: #ffffff;">
        <div><strong>Scholarship Cell & Accounts Section</strong></div>
        <div>Siddaganga Institute of Technology, B.H. Road, Tumakuru – 572103</div>
        <div style="margin-top: 4px;">Helpdesk: TODO_SCHOLARSHIPS_HELPDESK_EMAIL | Phone: 0816-2214000</div>
        <div style="margin-top: 8px; font-size: 10px; color: #94a3b8;">
          This is an automated institutional message. Please do not reply directly to this email.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
