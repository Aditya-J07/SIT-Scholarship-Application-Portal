import { NextResponse } from 'next/server';
import { requireAdminOrReviewer } from '@/lib/auth/admin-guard';
import { db } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';
import { NotificationType } from '@/lib/notifications';
import crypto from 'crypto';
import { verifyStateChangingOrigin } from '@/lib/auth/origin-guard';
import { getClientIp } from '@/lib/rate-limit';

const ALLOWED_ACTIONS = new Set([
  'recommendation',
  'accept',
  'reject',
  'shortlist',
  'correction',
  'under_review',
]);

const ALLOWED_RECOMMENDATION_STATUSES = new Set([
  'recommended',
  'not_recommended',
  'pending',
]);

// M2: Canonical status transition rules for administrative decisions
const ALLOWED_DECISION_TRANSITIONS: Record<string, string[]> = {
  submitted: ['under_review', 'needs_correction', 'shortlisted', 'accepted', 'rejected'],
  under_review: ['needs_correction', 'shortlisted', 'accepted', 'rejected'],
  shortlisted: ['accepted', 'rejected'],
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. CSRF Origin Verification
  const originErr = verifyStateChangingOrigin(request);
  if (originErr) return originErr;

  const { session, errorResponse } = await requireAdminOrReviewer();
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const application = await db.findApplicationById(id);
  if (!application) {
    return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
  }

  // M2: Draft applications cannot be decided
  if (application.status === 'draft') {
    return NextResponse.json(
      { error: { message: 'Draft applications cannot be decided. Application must be submitted by the student first.' } },
      { status: 409 }
    );
  }

  try {
    const body = await request.json();
    const { action, remark, hard_copy_received, recommendation_status, recommendation_note, is_override, admin_override } = body;

    // Validate action against allow-list (return 400, not 500)
    if (!action || !ALLOWED_ACTIONS.has(action)) {
      return NextResponse.json(
        { error: { message: 'Invalid or missing action parameter' } },
        { status: 400 }
      );
    }

    const clientIp = getClientIp(request);

    // Reviewer recommendation (HoD / Proctor) - accessible to both reviewer and admin
    if (action === 'recommendation') {
      const recStatus = recommendation_status || 'recommended';
      if (!ALLOWED_RECOMMENDATION_STATUSES.has(recStatus)) {
        return NextResponse.json(
          { error: { message: 'Invalid recommendation_status parameter' } },
          { status: 400 }
        );
      }

      const updated = await db.updateApplication(id, {
        recommendation_status: recStatus,
        recommendation_note: recommendation_note || remark,
      });

      await db.addRemark({
        id: crypto.randomUUID(),
        application_id: id,
        author_id: session.userId,
        author_name: session.fullName,
        author_role: session.role,
        kind: 'recommendation',
        body: `Recommendation marked as ${recStatus.toUpperCase()}: ${remark || 'Verified by Reviewer/HoD'}`,
        created_at: new Date().toISOString(),
      });

      await db.logAudit({
        actor_id: session.userId,
        actor_email: session.email,
        action: 'REVIEWER_RECOMMENDATION_RECORDED',
        entity: 'applications',
        entity_id: id,
        meta: { recommendation_status: recStatus, remark },
        ip: clientIp,
      });

      return NextResponse.json({ success: true, application: updated });
    }

    // Role check: Only admin can accept, reject, request correction, or shortlist
    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: { message: 'Only Accounts / Committee Administrators can officially make application decisions or request corrections' } },
        { status: 403 }
      );
    }

    let targetStatus = application.status;
    let notifType: NotificationType | null = null;

    if (action === 'accept') {
      targetStatus = 'accepted';
      notifType = 'APPLICATION_ACCEPTED';
    } else if (action === 'reject') {
      targetStatus = 'rejected';
      notifType = 'APPLICATION_REJECTED';
    } else if (action === 'shortlist') {
      targetStatus = 'shortlisted';
      notifType = 'SHORTLISTED_FOR_AWARD';
    } else if (action === 'correction') {
      targetStatus = 'needs_correction';
      notifType = 'CORRECTION_REQUESTED';
    } else if (action === 'under_review') {
      targetStatus = 'under_review';
    }

    if (action === 'reject' && (!remark || remark.trim().length === 0)) {
      return NextResponse.json(
        { error: { message: 'A rejection reason is mandatory' } },
        { status: 400 }
      );
    }

    if (action === 'correction' && (!remark || remark.trim().length === 0)) {
      return NextResponse.json(
        { error: { message: 'Please specify the exact correction instructions for the student' } },
        { status: 400 }
      );
    }

    // M2: Enforce status transition table and override rules
    const hasOverrideFlag = Boolean(is_override || admin_override);
    const hasOverrideReason = Boolean(remark && remark.trim().length > 0);
    const validOverride = hasOverrideFlag && hasOverrideReason;

    const isTerminalOrLocked = ['accepted', 'rejected', 'withdrawn', 'needs_correction'].includes(application.status);

    if (isTerminalOrLocked) {
      if (!validOverride) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_STATUS_TRANSITION',
              message: `Cannot transition application from status '${application.status}' to '${targetStatus}' without an explicit administrator override and documented reason.`,
            },
          },
          { status: 409 }
        );
      }
    } else {
      const allowedTargets = ALLOWED_DECISION_TRANSITIONS[application.status] || [];
      if (!allowedTargets.includes(targetStatus) && !validOverride) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_STATUS_TRANSITION',
              message: `Invalid status transition from '${application.status}' to '${targetStatus}'.`,
            },
          },
          { status: 409 }
        );
      }
    }

    const updated = await db.updateApplication(id, {
      status: targetStatus,
      decided_at: new Date().toISOString(),
      decided_by: session.userId,
      decision_remark: remark || undefined,
      ...(hard_copy_received !== undefined && { hard_copy_received }),
    });

    // Record Remark thread entry
    if (remark) {
      await db.addRemark({
        id: crypto.randomUUID(),
        application_id: id,
        author_id: session.userId,
        author_name: session.fullName,
        author_role: session.role,
        kind: action === 'correction' ? 'correction_request' : 'decision',
        body: remark,
        created_at: new Date().toISOString(),
      });
    }

    // Record in Audit Log
    await db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: validOverride ? 'ADMIN_DECISION_OVERRIDE' : `APPLICATION_DECISION_${action.toUpperCase()}`,
      entity: 'applications',
      entity_id: id,
      meta: {
        previous_status: application.status,
        new_status: targetStatus,
        remark,
        hard_copy_received,
        is_override: validOverride,
      },
      ip: clientIp,
    });

    // Send Notification to student
    const student = await db.findUserById(application.student_id);
    const scholarship = await db.findScholarshipByCode(application.data.scholarship_code || 'MNC');
    if (student && notifType) {
      await sendNotification({
        toEmail: student.email,
        toMobile: application.data.mobile || student.mobile,
        studentName: application.data.full_name || student.full_name,
        type: notifType,
        refNo: application.ref_no,
        scholarshipName: scholarship?.name,
        details: { remark: remark || '' },
      });
    }

    return NextResponse.json({ success: true, application: updated });
  } catch (error: unknown) {
    console.error('Decision update error:', error);
    return NextResponse.json({ error: { message: 'Failed to process decision' } }, { status: 500 });
  }
}
