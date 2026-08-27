import { Report } from '../models/Report.js';
import { Post } from '../models/Post.js';
import { Comment } from '../models/Comment.js';
import { ApiError } from '../utils/api.js';
import { writeAudit } from './auditService.js';
import { notify } from './notificationService.js';

export async function createReport(user, body) {
  if (body.targetType === 'post' && !body.postId) {
    throw new ApiError(400, 'Please choose a photograph to report.', 'VALIDATION_ERROR');
  }
  if (body.targetType === 'comment' && !body.commentId) {
    throw new ApiError(400, 'Please choose a comment to report.', 'VALIDATION_ERROR');
  }
  const report = await Report.create({
    reporter: user._id,
    targetType: body.targetType,
    post: body.postId,
    comment: body.commentId,
    reason: body.reason,
    details: body.details || '',
    removalRequest: Boolean(body.removalRequest),
  });
  return report;
}

export async function listReports({ status, page = 1, limit = 20 }) {
  const filter = {};
  if (status) filter.status = status;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Report.find(filter)
      .populate('reporter', 'profile.fullName email')
      .populate('post', 'caption images moderationStatus')
      .populate('comment', 'body status')
      .populate('resolvedBy', 'profile.fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Report.countDocuments(filter),
  ]);
  return { items, page, limit, total, pages: Math.ceil(total / limit) };
}

export async function resolveReport(actor, id, { status, resolutionNote, removeContent }) {
  const report = await Report.findById(id);
  if (!report) throw new ApiError(404, 'Report not found.', 'NOT_FOUND');
  report.status = status;
  report.resolutionNote = resolutionNote;
  report.resolvedBy = actor._id;
  report.resolvedAt = new Date();
  await report.save();

  if (removeContent) {
    if (report.post) {
      await Post.findByIdAndUpdate(report.post, { moderationStatus: 'removed' });
    }
    if (report.comment) {
      await Comment.findByIdAndUpdate(report.comment, { status: 'removed' });
    }
  }

  await writeAudit(actor, 'report.resolve', 'report', id, resolutionNote, { status, removeContent });
  await notify({
    recipient: report.reporter,
    actor: actor._id,
    type: 'moderation',
    post: report.post,
    message: 'Your report was reviewed by LFE staff.',
  });
  return report;
}
