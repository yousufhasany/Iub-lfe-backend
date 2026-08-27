import { Comment } from '../models/Comment.js';
import { Post } from '../models/Post.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/api.js';
import { sanitizeText } from '../utils/crypto.js';
import { serializeUser } from '../utils/serialize.js';
import { notify } from './notificationService.js';
import { writeAudit } from './auditService.js';

function serializeComment(comment, viewer) {
  const doc = comment.toObject ? comment.toObject() : comment;
  return {
    id: String(doc._id),
    body: doc.body,
    parent: doc.parent,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    author: serializeUser(doc.author, viewer),
  };
}

export async function listComments(postId, { page = 1, limit = 20 }, viewer) {
  const skip = (page - 1) * limit;
  const filter = { post: postId, parent: null, status: 'visible' };
  const [items, total] = await Promise.all([
    Comment.find(filter)
      .populate('author', 'profile.fullName profile.avatar profile.studentId role')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit),
    Comment.countDocuments(filter),
  ]);
  const ids = items.map((c) => c._id);
  const replies = await Comment.find({ parent: { $in: ids }, status: 'visible' })
    .populate('author', 'profile.fullName profile.avatar profile.studentId role')
    .sort({ createdAt: 1 });

  const grouped = new Map(items.map((c) => [String(c._id), []]));
  for (const reply of replies) {
    grouped.get(String(reply.parent))?.push(serializeComment(reply, viewer));
  }

  return {
    items: items.map((c) => ({ ...serializeComment(c, viewer), replies: grouped.get(String(c._id)) || [] })),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };
}

export async function addComment(user, postId, { body, parentId }) {
  const post = await Post.findById(postId);
  if (!post || post.moderationStatus !== 'approved') {
    throw new ApiError(404, 'Post not found.', 'NOT_FOUND');
  }
  const text = sanitizeText(body, 1000);
  if (!text) throw new ApiError(400, 'Comment cannot be empty.', 'VALIDATION_ERROR');
  if (/https?:\/\/|www\./i.test(text) && text.split(/\s+/).length < 4) {
    throw new ApiError(400, 'Please avoid posting unsolicited links.', 'SPAM_BLOCKED');
  }
  if (parentId) {
    const parent = await Comment.findById(parentId);
    if (!parent || String(parent.post) !== String(postId)) {
      throw new ApiError(400, 'The comment you are replying to was not found.', 'NOT_FOUND');
    }
  }
  const comment = await Comment.create({
    post: postId,
    author: user._id,
    body: text,
    parent: parentId || null,
  });
  await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });
  await User.findByIdAndUpdate(user._id, { $inc: { 'stats.comments': 1 } });

  const populated = await Comment.findById(comment._id).populate(
    'author',
    'profile.fullName profile.avatar profile.studentId role',
  );

  if (parentId) {
    const parent = await Comment.findById(parentId);
    if (parent && String(parent.author) !== String(user._id)) {
      await notify({
        recipient: parent.author,
        actor: user._id,
        type: 'reply',
        post: postId,
        comment: comment._id,
        message: `${user.profile.fullName} replied to your comment.`,
      });
    }
  } else if (String(post.author) !== String(user._id)) {
    await notify({
      recipient: post.author,
      actor: user._id,
      type: 'comment',
      post: postId,
      comment: comment._id,
      message: `${user.profile.fullName} commented on your photograph.`,
    });
  }

  return serializeComment(populated, user);
}

export async function updateComment(user, id, body) {
  const comment = await Comment.findById(id);
  if (!comment || comment.status !== 'visible') throw new ApiError(404, 'Comment not found.', 'NOT_FOUND');
  if (String(comment.author) !== String(user._id)) {
    throw new ApiError(403, 'You can only edit your own comments.', 'FORBIDDEN');
  }
  comment.body = sanitizeText(body, 1000);
  await comment.save();
  const populated = await Comment.findById(id).populate(
    'author',
    'profile.fullName profile.avatar profile.studentId role',
  );
  return serializeComment(populated, user);
}

export async function deleteComment(user, id, reason) {
  const comment = await Comment.findById(id);
  if (!comment) throw new ApiError(404, 'Comment not found.', 'NOT_FOUND');
  const isOwner = String(comment.author) === String(user._id);
  const isMod = user.role === 'admin' || user.role === 'teacher';
  if (!isOwner && !isMod) throw new ApiError(403, 'You can only delete your own comments.', 'FORBIDDEN');
  comment.status = 'removed';
  await comment.save();
  await Post.findByIdAndUpdate(comment.post, { $inc: { commentCount: -1 } });
  if (isMod && !isOwner) {
    await writeAudit(user, 'comment.delete', 'comment', id, reason);
  }
}
