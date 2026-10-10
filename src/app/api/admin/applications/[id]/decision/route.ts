import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: { message: 'Unauthorized administrator access required' } }, { status: 403 });
  }

  const { id } = await params;
  const application = db.findApplicationById(id);
  if (!application) {
    return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { action, remark, hard_copy_received, recommendation_status, recommendation_note } = body;

    // Reviewer recommendation (HoD / Proctor)
    if (action === 'recommendation') {
      const updated = db.updateApplication(id, {
        recommendation_status: recommendation_status || 'recommended',
        recommendation_note: recommendation_note || remark,
      });

      db.addRemark({
        id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        application_id: id,
        author_id: session.userId,
        author_name: session.fullName,
        author_role: session.role,
        kind: 'recommendation',
        body: `Recommendation marked as ${recommendation_status.toUpperCase()}: ${remark || 'Verified by HoD/Proctor'}`,
        created_at: new Date().toISOString(),
      });

      db.logAudit({
        actor_id: session.userId,
        actor_email: session.email,
        action: 'REVIEWER_RECOMMENDATION_RECORDED',
        entity: 'applications',
        entity_id: id,
        meta: { recommendation_status, remark },
      });

      return NextResponse.json({ success: true, application: updated });
    }

    // Role check: Only admin can accept or reject
    if (['accept', 'reject'].includes(action) && session.role !== 'admin') {
      return NextResponse.json(
        { error: { message: 'Only Accounts / Committee Administrators can officially Accept or Reject applications' } },
        { status: 403 }
      );
    }

    if (action === 'reject' && (!remark || remark.trim().length === 0)) {
      return NextResponse.json(
        { error: { message: 'A reason is mandatory when rejecting an application' } },
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
    let notifType: any = null;

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

    const updated = db.updateApplication(id, {
      status: newStatus,
      decided_at: new Date().toISOString(),
      decided_by: session.userId,
      decision_remark: remark || undefined,
      ...(hard_copy_received !== undefined && { hard_copy_received }),
    });

    // Record Remark thread entry
    if (remark) {
      db.addRemark({
        id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
    db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: `APPLICATION_DECISION_${action.toUpperCase()}`,
      entity: 'applications',
      entity_id: id,
      meta: {
        previous_status: application.status,
        new_status: newStatus,
        remark,
      },
    });

    // Send Notification to student
    const student = db.findUserById(application.student_id);
    const scholarship = db.findScholarshipByCode(application.data.scholarship_code || 'MNC');
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
