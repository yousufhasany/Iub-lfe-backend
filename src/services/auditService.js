import { AuditLog } from '../models/AuditLog.js';

export async function writeAudit(actor, action, targetType, targetId, reason, metadata) {
  if (!actor) return;
  await AuditLog.create({
    actor: actor._id || actor,
    action,
    targetType,
    targetId: targetId ? String(targetId) : undefined,
    reason,
    metadata,
  });
}

export async function listAuditLogs({ page = 1, limit = 30 }) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    AuditLog.find().populate('actor', 'profile.fullName email role').sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(),
  ]);
  return { items, page, limit, total, pages: Math.ceil(total / limit) };
}
