import { and, count, database, desc, eq, isNull, schema } from '@repo/db';

// The audit trail: one row per discrete change to an organization's content,
// model, or assets. Server-only; callers authenticate and resolve the
// organization before recording. Revisions (see @repo/content) hold what an
// entry looked like; this holds who did what, when, through which surface.

/** Which surface a change came through. */
export type Via = 'app' | 'ai' | 'import' | 'editor' | 'restore' | 'system';

/** Who made a change: the signed-in user, or null for unattended work. */
export type Actor = {
  userId: string | null;
  via: Via;
};

/** Every action the audit log can carry. Extend here, not at call sites. */
export type AuditAction =
  | 'type.create'
  | 'type.update'
  | 'type.delete'
  | 'field.create'
  | 'field.update'
  | 'field.delete'
  | 'field.purge'
  | 'entry.create'
  | 'entry.update'
  | 'entry.delete'
  | 'entry.restore'
  | 'asset.upload';

export type AuditSubjectType = 'type' | 'field' | 'entry' | 'asset';

export type AuditSubject = {
  type: AuditSubjectType;
  id: string;
  /** Display name at the time of the change, so the row outlives the subject. */
  label: string;
};

/**
 * Extra detail about one action, e.g. `{ from: 'Old name', to: 'New name' }`.
 * Flat and primitive on purpose: the log is read, never computed on, and it
 * crosses a server function boundary that only carries JSON.
 */
export type AuditDetails = Record<string, string | number | boolean | null>;

/**
 * Records one action in the organization's audit log.
 *
 * `coalesceMs` suppresses the write when the same actor performed the same
 * action on the same subject within the window, so continuous edits (cell
 * saves, body typing) read as one action rather than hundreds.
 */
export async function recordAudit(options: {
  organizationId: string;
  actor: Actor;
  action: AuditAction;
  subject: AuditSubject;
  details?: AuditDetails;
  coalesceMs?: number;
}): Promise<void> {
  const db = await database();
  if (options.coalesceMs !== undefined) {
    const latest = await db.query.auditLog.findFirst({
      where: and(
        eq(schema.auditLog.organizationId, options.organizationId),
        eq(schema.auditLog.subjectId, options.subject.id),
        eq(schema.auditLog.action, options.action),
        eq(schema.auditLog.via, options.actor.via),
        options.actor.userId === null
          ? isNull(schema.auditLog.actorId)
          : eq(schema.auditLog.actorId, options.actor.userId),
      ),
      orderBy: desc(schema.auditLog.createdAt),
      columns: { createdAt: true },
    });
    if (latest !== undefined && Date.now() - latest.createdAt.getTime() < options.coalesceMs) {
      return;
    }
  }
  await db.insert(schema.auditLog).values({
    id: crypto.randomUUID(),
    organizationId: options.organizationId,
    actorId: options.actor.userId,
    via: options.actor.via,
    action: options.action,
    subjectType: options.subject.type,
    subjectId: options.subject.id,
    label: options.subject.label,
    details: JSON.stringify(options.details ?? {}),
    createdAt: new Date(),
  });
}

export type AuditEntry = {
  id: string;
  action: AuditAction;
  subject: AuditSubject;
  details: AuditDetails;
  via: Via;
  /** Null when the actor was unattended work or a since-deleted user. */
  actor: { id: string; name: string } | null;
  createdAt: Date;
};

/** A page of the organization's audit log, newest first. */
export async function listAudit(
  organizationId: string,
  options: { limit: number; offset: number },
): Promise<{ entries: AuditEntry[]; total: number }> {
  const db = await database();
  const where = eq(schema.auditLog.organizationId, organizationId);
  const [rows, totals] = await Promise.all([
    db
      .select({
        id: schema.auditLog.id,
        action: schema.auditLog.action,
        subjectType: schema.auditLog.subjectType,
        subjectId: schema.auditLog.subjectId,
        label: schema.auditLog.label,
        details: schema.auditLog.details,
        via: schema.auditLog.via,
        createdAt: schema.auditLog.createdAt,
        actorId: schema.user.id,
        actorName: schema.user.name,
      })
      .from(schema.auditLog)
      .leftJoin(schema.user, eq(schema.auditLog.actorId, schema.user.id))
      .where(where)
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(options.limit)
      .offset(options.offset),
    db.select({ total: count() }).from(schema.auditLog).where(where),
  ]);
  return {
    entries: rows.map((row) => ({
      id: row.id,
      action: row.action as AuditAction,
      subject: {
        type: row.subjectType as AuditSubjectType,
        id: row.subjectId,
        label: row.label,
      },
      details: parseDetails(row.details),
      via: row.via as Via,
      actor:
        row.actorId === null || row.actorName === null
          ? null
          : { id: row.actorId, name: row.actorName },
      createdAt: row.createdAt,
    })),
    total: totals[0]?.total ?? 0,
  };
}

function parseDetails(details: string): AuditDetails {
  let parsed: unknown;
  try {
    parsed = JSON.parse(details);
  } catch {
    return {};
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {};
  }
  const safe: AuditDetails = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (['string', 'number', 'boolean'].includes(typeof value) || value === null) {
      safe[key] = value as string | number | boolean | null;
    }
  }
  return safe;
}
