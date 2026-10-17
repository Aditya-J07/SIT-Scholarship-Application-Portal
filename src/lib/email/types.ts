export type EmailEventType =
  | 'submitted'
  | 'correction_requested'
  | 'shortlisted'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'deadline_reminder';

export interface EmailRenderInput {
  refNo: string;
  studentName: string;
  scholarshipName?: string;
  remark?: string;
  deadlineDate?: string;
  portalUrl?: string;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}
