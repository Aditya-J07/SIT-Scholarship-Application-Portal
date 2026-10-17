import { PDFDocument, rgb, StandardFonts, PageSizes, degrees } from 'pdf-lib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { ApplicationRecord, Scholarship } from '../types';
import { storage } from '../storage';
import { decryptBankAccount } from '../crypto/field-encryption';

export interface GeneratePdfOptions {
  isDraft?: boolean;
  appUrl?: string;
}

export interface GeneratedPdfResult {
  pdfBuffer: Buffer;
  sha256: string;
}

export async function generateApplicationPdf(
  application: ApplicationRecord,
  scholarship: Scholarship,
  options: GeneratePdfOptions = {}
): Promise<GeneratedPdfResult> {
  const isDraft = options.isDraft ?? (application.status === 'draft');
  const appUrl = options.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const doc = await PDFDocument.create();
  const page = doc.addPage(PageSizes.A4); // [595.28, 841.89]
  const { width, height } = page.getSize();

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const primaryBrand = rgb(172 / 255, 61 / 255, 71 / 255);
  const black = rgb(0.1, 0.1, 0.1);
  const grayBorder = rgb(0.65, 0.65, 0.65);
  const lightGrayBg = rgb(0.96, 0.97, 0.98);

  const margin = 36;
  const contentWidth = width - margin * 2;

  // Header top border
  page.drawRectangle({ x: margin, y: height - 18, width: contentWidth, height: 2, color: primaryBrand });

  // Ref No & Header Meta
  const refText = `Application Ref: ${application.ref_no}`;
  page.drawText(refText, {
    x: margin,
    y: height - 32,
    size: 8.5,
    font: fontBold,
    color: primaryBrand,
  });

  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  page.drawText(`Generated: ${dateStr}`, {
    x: width - margin - 90,
    y: height - 32,
    size: 8,
    font,
    color: black,
  });

  // Embed College Logo if available
  const logoPath = path.join(process.cwd(), 'public', 'sit-logo.png');
  if (fs.existsSync(logoPath)) {
    try {
      const logoBytes = fs.readFileSync(logoPath);
      const logoImage = await doc.embedPng(logoBytes);
      page.drawImage(logoImage, {
        x: margin,
        y: height - 74,
        width: 30,
        height: 36,
      });
    } catch {
      // Fallback cleanly
    }
  }

  // College Name & Subheading
  const collegeTitle = 'SIDDAGANGA INSTITUTE OF TECHNOLOGY';
  const collegeLoc = 'B.H. Road, Tumakuru – 572103, Karnataka';
  const titleWidth = fontBold.widthOfTextAtSize(collegeTitle, 13);
  page.drawText(collegeTitle, {
    x: (width - titleWidth) / 2,
    y: height - 52,
    size: 13,
    font: fontBold,
    color: primaryBrand,
  });

  const locWidth = font.widthOfTextAtSize(collegeLoc, 9);
  page.drawText(collegeLoc, {
    x: (width - locWidth) / 2,
    y: height - 64,
    size: 9,
    font,
    color: black,
  });

  // Form Title
  const formTitle = scholarship.name;
  const ftWidth = fontBold.widthOfTextAtSize(formTitle, 10);
  page.drawText(formTitle, {
    x: (width - ftWidth) / 2,
    y: height - 80,
    size: 10,
    font: fontBold,
    color: primaryBrand,
  });

  const appFormSub = 'APPLICATION FORM';
  const afsWidth = fontBold.widthOfTextAtSize(appFormSub, 10);
  page.drawText(appFormSub, {
    x: (width - afsWidth) / 2,
    y: height - 93,
    size: 10,
    font: fontBold,
    color: black,
  });

  // Photo Box (Top Right, 3.5 x 4.5 ratio: 80 x 100 pt)
  const photoBoxWidth = 75;
  const photoBoxHeight = 90;
  const photoBoxX = width - margin - photoBoxWidth - 4;
  const photoBoxY = height - 195;

  page.drawRectangle({
    x: photoBoxX,
    y: photoBoxY,
    width: photoBoxWidth,
    height: photoBoxHeight,
    borderColor: grayBorder,
    borderWidth: 1,
    color: rgb(0.98, 0.98, 0.98),
  });

  // Embed Photo if uploaded
  let photoEmbedded = false;
  try {
    const jpgBytes = await storage.getFileBuffer(`${application.id}_photo.jpg`);
    const pngBytes = !jpgBytes ? await storage.getFileBuffer(`${application.id}_photo.png`) : null;
    if (jpgBytes) {
      const embeddedImg = await doc.embedJpg(jpgBytes);
      page.drawImage(embeddedImg, {
        x: photoBoxX + 1,
        y: photoBoxY + 1,
        width: photoBoxWidth - 2,
        height: photoBoxHeight - 2,
      });
      photoEmbedded = true;
    } else if (pngBytes) {
      const embeddedImg = await doc.embedPng(pngBytes);
      page.drawImage(embeddedImg, {
        x: photoBoxX + 1,
        y: photoBoxY + 1,
        width: photoBoxWidth - 2,
        height: photoBoxHeight - 2,
      });
      photoEmbedded = true;
    }
  } catch (err) {
    console.error('Error embedding student photo in PDF:', err);
  }

  if (!photoEmbedded) {
    page.drawText('Affix Passport', {
      x: photoBoxX + 10,
      y: photoBoxY + 50,
      size: 7.5,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText('Size Photograph', {
      x: photoBoxX + 7,
      y: photoBoxY + 38,
      size: 7.5,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  // Draw Main Form Fields Table
  const startY = height - 105;
  let currY = startY;
  const tableLeft = margin;
  const tableWidth = contentWidth;

  const rowHeight = 22;
  const col1W = 28; // Number "1)"
  const col2W = 185; // Label
  const col3W = tableWidth - col1W - col2W; // Value

  const drawRow = (
    num: string,
    label: string,
    value: string,
    heightOverride = rowHeight,
    subRows?: { label: string; value: string }[]
  ) => {
    const rHeight = subRows ? heightOverride : rowHeight;

    // Background and border
    page.drawRectangle({
      x: tableLeft,
      y: currY - rHeight,
      width: tableWidth,
      height: rHeight,
      borderColor: grayBorder,
      borderWidth: 0.75,
    });

    // Vertical column divider 1
    page.drawLine({
      start: { x: tableLeft + col1W, y: currY },
      end: { x: tableLeft + col1W, y: currY - rHeight },
      color: grayBorder,
      thickness: 0.75,
    });

    // Vertical column divider 2
    page.drawLine({
      start: { x: tableLeft + col1W + col2W, y: currY },
      end: { x: tableLeft + col1W + col2W, y: currY - rHeight },
      color: grayBorder,
      thickness: 0.75,
    });

    // Number text
    page.drawText(num, {
      x: tableLeft + 6,
      y: currY - 14,
      size: 8,
      font: fontBold,
      color: black,
    });

    if (!subRows) {
      // Main Label
      page.drawText(label, {
        x: tableLeft + col1W + 6,
        y: currY - 14,
        size: 8,
        font: fontBold,
        color: black,
      });

      // Value text (truncated or wrapped if needed)
      const valText = value || 'N/A';
      page.drawText(valText.length > 55 ? valText.substring(0, 52) + '...' : valText, {
        x: tableLeft + col1W + col2W + 6,
        y: currY - 14,
        size: 8,
        font,
        color: black,
      });
    } else {
      // Multiple sublines inside row
      subRows.forEach((sub, sIdx) => {
        const subY = currY - 13 - sIdx * 15;
        page.drawText(sub.label, {
          x: tableLeft + col1W + 6,
          y: subY,
          size: 7.5,
          font: fontBold,
          color: black,
        });
        const subVal = sub.value || 'N/A';
        page.drawText(subVal.length > 55 ? subVal.substring(0, 52) + '...' : subVal, {
          x: tableLeft + col1W + col2W + 6,
          y: subY,
          size: 7.5,
          font,
          color: black,
        });

        if (sIdx < subRows.length - 1) {
          page.drawLine({
            start: { x: tableLeft + col1W, y: currY - (sIdx + 1) * 16 },
            end: { x: tableLeft + tableWidth, y: currY - (sIdx + 1) * 16 },
            color: grayBorder,
            thickness: 0.5,
          });
        }
      });
    }

    currY -= rHeight;
  };

  const appData = application.data;

  // 1) Name in full
  drawRow('1)', 'Name in Full (CAPITAL LETTERS)', appData.full_name || '');
  // 2) DOB
  drawRow('2)', 'Date of Birth :', `${appData.dob || ''}  (Age: ${appData.dob ? calculateAge(appData.dob) + ' yrs' : ''})`);
  // 3) Nationality
  drawRow('3)', 'Nationality :', appData.nationality || 'Indian');
  // 4) Father's name
  drawRow('4)', "Father's / Guardian's name :", appData.father_or_guardian_name || '');
  // 5) Address, Mobile, Email
  drawRow('5)', 'Address for communication', '', 48, [
    { label: 'Address :', value: `${appData.address || ''}${appData.pincode ? ' - ' + appData.pincode : ''}` },
    { label: 'Mobile :', value: appData.mobile || '' },
    { label: 'Email-id :', value: appData.email || '' },
  ]);

  // 6) Occupation & Income
  const formattedIncome = appData.family_annual_income !== undefined 
    ? `Rs. ${appData.family_annual_income.toLocaleString('en-IN')} / year (Cert Date: ${appData.income_cert_issue_date || 'N/A'})`
    : 'N/A';
  drawRow('6)', 'Family Background', '', 34, [
    { label: 'a) Occupation of Parent / Guardian :', value: appData.parent_occupation || '' },
    { label: 'b) Annual income of entire family :', value: formattedIncome },
  ]);

  // 7) Academic performance
  const pctStr = appData.percentage 
    ? `${appData.percentage}%` 
    : (appData.marks_obtained && appData.marks_gross_total 
        ? `${((appData.marks_obtained / appData.marks_gross_total) * 100).toFixed(2)}%` 
        : 'N/A');
  drawRow('7)', 'Academic Qualifications', '', 48, [
    { label: 'a) Particulars of last exam passed :', value: `${appData.last_exam_passed || ''} ${appData.admitted_through_cet ? '(CET Admitted)' : '(Non-CET)'}` },
    { label: 'b) Marks Obtained / Gross Total :', value: `${appData.marks_obtained || 0} / ${appData.marks_gross_total || 0}` },
    { label: 'c) Percentage of marks :', value: `${pctStr}${appData.cgpa ? ' | CGPA: ' + appData.cgpa + '/10.0' : ''}` },
  ]);

  // 8) Current Course & semester
  drawRow('8)', 'Present Course of Study', '', 48, [
    { label: 'a) Course & Semester / Year :', value: `${appData.course || ''} - Year ${appData.year_of_study || 1}, Sem ${appData.semester || 1}` },
    { label: 'b) Duration of the course :', value: `${appData.course_duration_years || 4} Years` },
    { label: 'c) Month & Year of Final Exam :', value: appData.final_exam_month_year || '' },
  ]);

  // 9) Fee
  const feeLabel = scholarship.fee_label || 'Total fee per year';
  drawRow('9)', `${feeLabel} :`, `Rs. ${(appData.annual_fee || 0).toLocaleString('en-IN')}`);

  // 10) Previous application
  const prevApp = appData.applied_earlier 
    ? `Yes, Ref/File No. ${appData.previous_application_ref_no || ''}`
    : 'No';
  drawRow('10)', 'Applied previously to this fund? :', prevApp);

  // 11) Other stipend
  const otherStipend = appData.getting_other_scholarship
    ? `Yes, Rs. ${appData.other_scholarship_amount_per_month || 0} / month`
    : 'No';
  drawRow('11)', 'Any stipend/scholarship other source? :', otherStipend);

  // 12) Amount required
  drawRow('12)', 'Scholarship amount required :', `Rs. ${(appData.scholarship_amount_required_per_month || 0).toLocaleString('en-IN')} per month`);

  // 13) Bank Account (signed form displays full account number)
  let bankNumberDisplay = appData.bank_acc_no || '';
  if (!bankNumberDisplay && appData.bank_acc_no_encrypted) {
    try {
      bankNumberDisplay = decryptBankAccount(appData.bank_acc_no_encrypted);
    } catch {
      bankNumberDisplay = appData.bank_acc_last4 ? `XXXX${appData.bank_acc_last4}` : '';
    }
  }

  drawRow('13)', 'Bank Account Details of Student', '', 56, [
    { label: 'S.B. A/c. No. :', value: bankNumberDisplay },
    { label: 'Name of the Bank :', value: `${appData.bank_name || ''} (Holder: ${appData.bank_acc_holder_name || ''})` },
    { label: 'Branch Address :', value: appData.bank_branch || '' },
    { label: 'IFSC Code :', value: appData.bank_ifsc || '' },
  ]);

  currY -= 10;

  // Certification Line
  const certText = 'I hereby Certify that the information disclosed by me is true. I agree to abide by all the Terms and Conditions of the Committee.';
  page.drawText(certText, {
    x: margin + 4,
    y: currY,
    size: 7.5,
    font: fontBold,
    color: black,
  });

  currY -= 12;

  // Parental Consent for Minors (< 18 years on application date)
  // TODO [COLLEGE DECISION REQUIRED]: Legal confirmation required for minor consent threshold and declaration wording.
  const applicantAge = appData.dob ? calculateAge(appData.dob) : 18;
  if (applicantAge < 18) {
    const guardianName = appData.guardian_consent_name || appData.father_or_guardian_name || 'Parent/Guardian';
    const minorConsentNotice = `TODO [COLLEGE DECISION REQUIRED]: Guardian Consent: I, ${guardianName}, lawful parent/guardian of minor applicant, consent to data processing under DPDP Act 2023.`;
    page.drawText(minorConsentNotice, {
      x: margin + 4,
      y: currY,
      size: 6.5,
      font: fontBold,
      color: primaryBrand,
    });
    currY -= 12;
  }

  currY -= 2;

  // Signatures Section
  const sigBoxHeight = 35;
  const parentSigX = margin + 15;
  const studentSigX = width - margin - 190;

  // Try to embed Parent signature
  try {
    const sigBytes = await storage.getFileBuffer(`${application.id}_sig_parent.png`);
    if (sigBytes) {
      const embeddedSig = await doc.embedPng(sigBytes);
      page.drawImage(embeddedSig, {
        x: parentSigX,
        y: currY - 26,
        width: 90,
        height: 26,
      });
    }
  } catch (err) {
    console.error('Error embedding parent sig:', err);
  }

  // Try to embed Student signature
  try {
    const sigBytes = await storage.getFileBuffer(`${application.id}_sig_student.png`);
    if (sigBytes) {
      const embeddedSig = await doc.embedPng(sigBytes);
      page.drawImage(embeddedSig, {
        x: studentSigX,
        y: currY - 26,
        width: 90,
        height: 26,
      });
    }
  } catch (err) {
    console.error('Error embedding student sig:', err);
  }

  currY -= sigBoxHeight;

  page.drawText('(Signature of the Parent/Guardian)', {
    x: parentSigX,
    y: currY,
    size: 8,
    font: fontBold,
    color: black,
  });

  page.drawText('(Signature of the Student)', {
    x: studentSigX + 15,
    y: currY,
    size: 8,
    font: fontBold,
    color: black,
  });

  page.drawText(`Date : ${dateStr}`, {
    x: margin + 15,
    y: currY - 14,
    size: 8,
    font,
    color: black,
  });

  currY -= 20;

  // SSKA Special Recommendation Block if applicable
  if (scholarship.code === 'SSKA' || scholarship.requires_recommendation) {
    page.drawRectangle({
      x: margin,
      y: currY - 44,
      width: contentWidth,
      height: 44,
      borderColor: grayBorder,
      borderWidth: 0.75,
      color: lightGrayBg,
    });

    const recLine = 'Recommendation: The above student is known to me personally and the financial condition of the student is not satisfactory to pay the annual fee of the Institute.';
    page.drawText(recLine, {
      x: margin + 8,
      y: currY - 12,
      size: 7,
      font: fontBold,
      color: black,
    });

    page.drawText('Signature of the Proctor', {
      x: margin + 25,
      y: currY - 36,
      size: 7.5,
      font: fontBold,
      color: black,
    });

    page.drawText('Signature of the Head of the Department', {
      x: width - margin - 200,
      y: currY - 36,
      size: 7.5,
      font: fontBold,
      color: black,
    });

    currY -= 50;
  }

  // Enclosures List
  page.drawText('Enclose Copies of the following certificates issued by the competent authority and duly attested by the Head of the Department:', {
    x: margin,
    y: currY,
    size: 7,
    font: fontBold,
    color: primaryBrand,
  });

  currY -= 9;
  const enclosures = [
    '(a) Photocopy of CET Order',
    '(b) Photocopy of last examination marks card / results',
    '(c) Photocopy of income certificate (not older than 5 years as on application date)',
    '(d) Photocopy of Student Aadhaar Card',
    '(e) Photocopy of College Fee Paid Receipt',
    "(f) Copy of Certificate from the Principal, Siddaganga Institute of Technology, Tumakuru confirming no other assistance > 30% of fee",
  ];

  enclosures.forEach((enc) => {
    page.drawText(enc, {
      x: margin + 6,
      y: currY,
      size: 6.8,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    currY -= 8.5;
  });

  // Footer: QR Code & Verification Line
  const qrTargetUrl = `${appUrl}/verify/${application.ref_no}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(qrTargetUrl, {
      margin: 1,
      width: 48,
    });
    const qrImageBase64 = qrDataUrl.split(',')[1];
    const qrBytes = Buffer.from(qrImageBase64, 'base64');
    const qrImage = await doc.embedPng(qrBytes);

    page.drawImage(qrImage, {
      x: width - margin - 46,
      y: 12,
      width: 40,
      height: 40,
    });
  } catch (err) {
    console.error('Error generating QR code for PDF:', err);
  }

  page.drawText(`Official Digital Form | Verify Authenticity: ${qrTargetUrl}`, {
    x: margin,
    y: 24,
    size: 6.5,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  page.drawText('Note: Print, sign and submit to Accounts Section with enclosures if physical submission is requested.', {
    x: margin,
    y: 14,
    size: 6.5,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Watermark "DRAFT" if draft
  if (isDraft) {
    page.drawText('DRAFT - PREVIEW ONLY', {
      x: width / 2 - 170,
      y: height / 2 - 20,
      size: 34,
      font: fontBold,
      color: rgb(0.85, 0.85, 0.85),
      rotate: degrees(35),
    });
  }

  const pdfBytes = await doc.save();
  const pdfBuffer = Buffer.from(pdfBytes);
  const sha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

  return { pdfBuffer, sha256 };
}

function calculateAge(dobStr: string): number {
  const birth = new Date(dobStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
