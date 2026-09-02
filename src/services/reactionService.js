import { Reaction } from '../models/Reaction.js';
import { Post } from '../models/Post.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/api.js';
import { serializeUser } from '../utils/serialize.js';
import { notify } from './notificationService.js';

const TYPES = ['like', 'love', 'smile', 'clap'];

async function recount(postId) {
  const counts = await Reaction.aggregate([
    { $match: { post: postId } },
    { $group: { _id: '$type', n: { $sum: 1 } } },
  ]);
  const breakdown = { like: 0, love: 0, smile: 0, clap: 0 };
  let total = 0;
  for (const row of counts) {
    breakdown[row._id] = row.n;
    total += row.n;
  }
  const post = await Post.findByIdAndUpdate(postId, { reactionCount: total, reactionBreakdown: breakdown }, { new: true });
  return { reactionCount: total, reactionBreakdown: breakdown, post };
}

function serializeReaction(doc, viewer) {
  return {
    id: String(doc._id),
    type: doc.type,
    createdAt: doc.createdAt,
    user: serializeUser(doc.user, viewer),
    post: doc.post
      ? {
          id: String(doc.post._id || doc.post),
          caption: doc.post.caption || '',
          image: doc.post.images?.[0] || null,
        }
      : null,
  };
}

export async function listPostReactions(postId, viewer) {
  const post = await Post.findById(postId);
  if (!post) throw new ApiError(404, 'Post not found.', 'NOT_FOUND');
  const staff = viewer?.role === 'admin' || viewer?.role === 'teacher';
  if (!staff && (post.moderationStatus !== 'approved' || post.visibility !== 'public')) {
    throw new ApiError(404, 'Post not found.', 'NOT_FOUND');
  }
  const items = await Reaction.find({ post: post._id })
    .populate('user', 'profile.fullName profile.avatar profile.studentId role stats lfe')
    .sort({ createdAt: -1 })
    .limit(50);
  return items.map((item) => serializeReaction(item, viewer));
}

export async function listAuthorReactions(authorId, viewer) {
  if (!authorId) return [];
  const posts = await Post.find({
    author: authorId,
    moderationStatus: 'approved',
    visibility: 'public',
  }).select('_id');
  const items = await Reaction.find({ post: { $in: posts.map((p) => p._id) } })
    .populate('user', 'profile.fullName profile.avatar profile.studentId role stats lfe')
    .populate('post', 'caption images')
    .sort({ createdAt: -1 })
    .limit(24);
  return items.map((item) => serializeReaction(item, viewer));
}

export async function setReaction(user, postId, type = 'like') {
  if (!TYPES.includes(type)) throw new ApiError(400, 'Invalid reaction.', 'VALIDATION_ERROR');
  const post = await Post.findById(postId);
  if (!post || post.moderationStatus !== 'approved') throw new ApiError(404, 'Post not found.', 'NOT_FOUND');

  const existing = await Reaction.findOne({ post: postId, user: user._id });
  if (existing && existing.type === type) {
    await existing.deleteOne();
    const result = await recount(post._id);
    if (String(post.author) !== String(user._id)) {
      await User.findByIdAndUpdate(post.author, { $inc: { 'stats.reactionsReceived': -1 } });
    }
    return { myReaction: null, ...result };
  }

  if (existing) {
    existing.type = type;
    await existing.save();
  } else {
    await Reaction.create({ post: postId, user: user._id, type });
    if (String(post.author) !== String(user._id)) {
      await User.findByIdAndUpdate(post.author, { $inc: { 'stats.reactionsReceived': 1 } });
      await notify({
        recipient: post.author,
        actor: user._id,
        type: 'reaction',
        post: postId,
        message: `${user.profile.fullName} reacted to your photograph.`,
      });
    }
  }
  const result = await recount(post._id);
  return { myReaction: type, ...result };
}

export async function removeReaction(user, postId) {
  const existing = await Reaction.findOne({ post: postId, user: user._id });
  if (!existing) {
    const post = await Post.findById(postId);
    return {
      myReaction: null,
      reactionCount: post?.reactionCount || 0,
      reactionBreakdown: post?.reactionBreakdown,
    };
  }
  const post = await Post.findById(postId);
  await existing.deleteOne();
  if (post && String(post.author) !== String(user._id)) {
    await User.findByIdAndUpdate(post.author, { $inc: { 'stats.reactionsReceived': -1 } });
  }
  const result = await recount(postId);
  return { myReaction: null, ...result };
}
