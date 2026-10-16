// Notification service with templates (Email / SMS)

export type NotificationType = 
  | 'WELCOME_STUDENT'
  | 'APPLICATION_SUBMITTED'
  | 'CORRECTION_REQUESTED'
  | 'SHORTLISTED_FOR_AWARD'
  | 'APPLICATION_ACCEPTED'
  | 'APPLICATION_REJECTED';

export interface NotificationPayload {
  toEmail: string;
  toMobile?: string;
  studentName: string;
  type: NotificationType;
  refNo?: string;
  scholarshipName?: string;
  details?: Record<string, string>;
}

export function generateNotificationContent(payload: NotificationPayload): { subject: string; body: string } {
  const { studentName, type, refNo, scholarshipName, details } = payload;
  const sit = 'Siddaganga Institute of Technology, Tumakuru – 572103';

  switch (type) {
    case 'APPLICATION_SUBMITTED':
      return {
        subject: `Application Submitted Successfully - Ref: ${refNo} | ${sit}`,
        body: `Dear ${studentName},\n\nYour application for the scholarship "${scholarshipName}" has been successfully submitted.\n\nApplication Reference Number: ${refNo}\n\nYou can track the progress of your application and download your print-ready PDF anytime from your portal dashboard.\n\nRegards,\nScholarship Section\n${sit}`,
      };

    case 'CORRECTION_REQUESTED':
      return {
        subject: `Action Required: Correction Requested for Application ${refNo} | ${sit}`,
        body: `Dear ${studentName},\n\nThe scrutiny committee has reviewed your scholarship application (${refNo}) and requested corrections before it can be processed further.\n\nRemark from Reviewer:\n"${details?.remark || 'Please review your uploaded documents and details.'}"\n\nPlease log in to the SIT Scholarship Portal, update the required information, and re-submit your form.\n\nRegards,\nScholarship Section\n${sit}`,
      };

    case 'SHORTLISTED_FOR_AWARD':
      return {
        subject: `Congratulations: Shortlisted for Scholarship Award - Application ${refNo} | ${sit}`,
        body: `Dear ${studentName},\n\nWe are pleased to inform you that based on your academic merit and financial eligibility, your application has been shortlisted by the Scholarship Scrutiny Committee for award sanction.\n\nScholarship: ${scholarshipName}\nReference: ${refNo}\n\nRegards,\nEndowment Scholarship Committee\n${sit}`,
      };

    case 'APPLICATION_ACCEPTED':
      return {
        subject: `Official Sanction: Scholarship Award Approved - ${refNo} | ${sit}`,
        body: `Dear ${studentName},\n\nCongratulations! Your application for "${scholarshipName}" (Ref: ${refNo}) has been APPROVED by the Committee.\n\nSanction details: ${details?.remark || 'Sanction amount will be disbursed to your registered bank account.'}\n\nRegards,\nAccounts Section\n${sit}`,
      };

    case 'APPLICATION_REJECTED':
      return {
        subject: `Status Update: Scholarship Application ${refNo} | ${sit}`,
        body: `Dear ${studentName},\n\nYour scholarship application (${refNo}) has been reviewed by the Committee. Regrettably, your application could not be selected for this academic cycle.\n\nReason: ${details?.remark || 'Criteria not met or selected quota filled by higher merit.'}\n\nWe wish you all the best in your academic endeavors.\n\nRegards,\nScholarship Section\n${sit}`,
      };

    case 'WELCOME_STUDENT':
    default:
      return {
        subject: `Welcome to SIT Scholarship Portal | ${sit}`,
        body: `Dear ${studentName},\n\nWelcome to the official Scholarship Application Portal of ${sit}. You can now apply for college endowment scholarships, track submissions, and generate official forms online.\n\nPortal: http://localhost:3000\n\nRegards,\nAccounts & Scholarship Administration`,
      };
  }
}

export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  // In production, integrate Resend/SMTP and SMS gateway here.
  // Fallback logger records only event type and reference number to prevent PII leakage (Low)
  console.log(`[NOTIFICATION_DISPATCH] Type: ${payload.type} | Ref: ${payload.refNo || 'N/A'}`);
  return true;
}
