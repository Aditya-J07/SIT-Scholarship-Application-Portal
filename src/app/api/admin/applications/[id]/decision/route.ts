import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';
import { NotificationType } from '@/lib/notifications';
import crypto from 'crypto';

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session || (session.role !== 'admin' && session.role !== 'reviewer')) {
    return NextResponse.json({ error: { message: 'Unauthorized staff access required' } }, { status: 403 });
  }

  const { id } = await params;
  const application = await db.findApplicationById(id);
  if (!application) {
    return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { action, remark, hard_copy_received, recommendation_status, recommendation_note } = body;

    // Validate action against allow-list (return 400, not 500)
    if (!action || !ALLOWED_ACTIONS.has(action)) {
      return NextResponse.json(
        { error: { message: 'Invalid or missing action parameter' } },
        { status: 400 }
      );
    }

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

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

    let newStatus = application.status;
    let notifType: NotificationType | null = null;

    if (action === 'accept') {
      newStatus = 'accepted';
      notifType = 'APPLICATION_ACCEPTED';
    } else if (action === 'reject') {
      newStatus = 'rejected';
      notifType = 'APPLICATION_REJECTED';
    } else if (action === 'shortlist') {
      newStatus = 'shortlisted';
      notifType = 'SHORTLISTED_FOR_AWARD';
    } else if (action === 'correction') {
      newStatus = 'needs_correction';
      notifType = 'CORRECTION_REQUESTED';
    } else if (action === 'under_review') {
      newStatus = 'under_review';
    }

    const updated = await db.updateApplication(id, {
      status: newStatus,
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
      action: `APPLICATION_DECISION_${action.toUpperCase()}`,
      entity: 'applications',
      entity_id: id,
      meta: {
        previous_status: application.status,
        new_status: newStatus,
        remark,
        hard_copy_received,
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
