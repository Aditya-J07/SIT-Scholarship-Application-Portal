import { EmailEventType, EmailRenderInput, RenderedEmail } from '../types';
import { renderSubmittedEmail } from './submitted';
import { renderCorrectionRequestedEmail } from './correctionRequested';
import { renderShortlistedEmail } from './shortlisted';
import { renderAcceptedEmail } from './accepted';
import { renderRejectedEmail } from './rejected';
import { renderWithdrawnEmail } from './withdrawn';
import { renderDeadlineReminderEmail } from './deadlineReminder';

export {
  renderSubmittedEmail,
  renderCorrectionRequestedEmail,
  renderShortlistedEmail,
  renderAcceptedEmail,
  renderRejectedEmail,
  renderWithdrawnEmail,
  renderDeadlineReminderEmail,
};

export function renderEmail(type: EmailEventType, input: EmailRenderInput): RenderedEmail {
  switch (type) {
    case 'submitted':
      return renderSubmittedEmail(input);
    case 'correction_requested':
      return renderCorrectionRequestedEmail(input);
    case 'shortlisted':
      return renderShortlistedEmail(input);
    case 'accepted':
      return renderAcceptedEmail(input);
    case 'rejected':
      return renderRejectedEmail(input);
    case 'withdrawn':
      return renderWithdrawnEmail(input);
    case 'deadline_reminder':
      return renderDeadlineReminderEmail(input);
    default:
      throw new Error(`Unsupported email event type: ${type}`);
  }
}
