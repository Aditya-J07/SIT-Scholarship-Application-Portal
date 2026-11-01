// SIT Scholarship Portal - Notification Service
import { sendEmailNotification } from './email/client';
import { EmailEventType } from './email/types';

export type NotificationType =
  | 'WELCOME_STUDENT'
  | 'APPLICATION_SUBMITTED'
  | 'CORRECTION_REQUESTED'
  | 'SHORTLISTED_FOR_AWARD'
  | 'APPLICATION_ACCEPTED'
  | 'APPLICATION_REJECTED'
  | 'APPLICATION_WITHDRAWN'
  | 'DEADLINE_REMINDER';

export interface NotificationPayload {
  toEmail: string;
  toMobile?: string;
  studentName: string;
  type: NotificationType;
  refNo?: string;
  scholarshipName?: string;
  details?: Record<string, string>;
  deadlineDate?: string;
}

function mapToEmailEventType(type: NotificationType): EmailEventType | null {
  switch (type) {
    case 'APPLICATION_SUBMITTED':
      return 'submitted';
    case 'CORRECTION_REQUESTED':
      return 'correction_requested';
    case 'SHORTLISTED_FOR_AWARD':
      return 'shortlisted';
    case 'APPLICATION_ACCEPTED':
      return 'accepted';
    case 'APPLICATION_REJECTED':
      return 'rejected';
    case 'APPLICATION_WITHDRAWN':
      return 'withdrawn';
    case 'DEADLINE_REMINDER':
      return 'deadline_reminder';
    case 'WELCOME_STUDENT':
    default:
      return null;
  }
}

export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  const emailType = mapToEmailEventType(payload.type);

  if (!emailType) {
    // For system events without specific email templates, log safely
    console.log(`[NOTIFICATION_DISPATCH] Type: ${payload.type} | Ref: ${payload.refNo || 'N/A'}`);
    return true;
  }

  return sendEmailNotification({
    to: payload.toEmail,
    type: emailType,
    input: {
      refNo: payload.refNo || 'N/A',
      studentName: payload.studentName,
      scholarshipName: payload.scholarshipName,
      remark: payload.details?.remark,
      deadlineDate: payload.deadlineDate || payload.details?.deadlineDate,
    },
  });
}
