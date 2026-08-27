import { Post } from '../models/Post.js';
import { User } from '../models/User.js';
import { Reaction } from '../models/Reaction.js';
import { Comment } from '../models/Comment.js';
import { Venue } from '../models/Venue.js';
import { Semester } from '../models/Semester.js';
import { Group } from '../models/Group.js';
import { PlatformSettings } from '../models/PlatformSettings.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api.js';
import { sanitizeText } from '../utils/crypto.js';
import { serializeUser } from '../utils/serialize.js';
import { storeImages, removeImage } from './imageStorage/index.js';
import { notify } from './notificationService.js';
import { writeAudit } from './auditService.js';

const POST_POPULATE = [
  { path: 'author', select: 'profile.fullName profile.avatar profile.studentId role stats lfe' },
  { path: 'venue', select: 'name slug district division' },
  { path: 'group', select: 'number' },
  { path: 'semester', select: 'year season' },
];

export function serializePost(post, viewer, extras = {}) {
  const doc = post.toObject ? post.toObject({ virtuals: true }) : post;
  return {
    id: String(doc._id),
    caption: doc.caption,
    images: doc.images,
    tags: doc.tags,
    visibility: doc.visibility,
    moderationStatus: doc.moderationStatus,
    featured: doc.featured,
    reactionCount: doc.reactionCount,
    commentCount: doc.commentCount,
    reactionBreakdown: doc.reactionBreakdown,
    location: doc.location,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    author: serializeUser(doc.author, viewer),
    venue: doc.venue,
    group: doc.group,
    semester: doc.semester,
    ...extras,
  };
}

function publicFilter() {
  return { moderationStatus: 'approved', visibility: 'public' };
}

async function autoApproveEnabled() {
  const settings = await PlatformSettings.findOne({ key: 'default' });
  if (settings) return settings.autoApprovePosts;
  return env.autoApprovePosts;
}

export async function createPost(user, body, files) {
  if (!files?.length) {
    throw new ApiError(400, 'Please add at least one photograph.', 'IMAGES_REQUIRED');
  }
  if (files.length > 10) {
    throw new ApiError(400, 'You can upload at most 10 photographs per post.', 'TOO_MANY_FILES');
  }
  if (!body.communityConsent || !body.copyrightConfirmation) {
    throw new ApiError(400, 'Please confirm consent and photograph rights before publishing.', 'CONSENT_REQUIRED');
  }

  const venueId = body.venueId || user.lfe?.venue;
  const semesterId = body.semesterId || user.lfe?.semester;
  const groupId = body.groupId || user.lfe?.group;
  if (!venueId || !semesterId) {
    throw new ApiError(
      400,
      'Please complete your profile with venue, semester, and group before uploading.',
      'LFE_ASSIGNMENT_REQUIRED',
    );
  }

  const [venue, semester] = await Promise.all([
    Venue.findById(venueId),
    Semester.findById(semesterId),
  ]);
  if (!venue) throw new ApiError(400, 'Venue not found.', 'NOT_FOUND');
  if (!semester) throw new ApiError(400, 'Semester not found.', 'NOT_FOUND');
  if (groupId) {
    const group = await Group.findById(groupId);
    if (!group) throw new ApiError(400, 'Group not found.', 'NOT_FOUND');
  }

  const images = await storeImages(files, 'lfe/posts');
  const approve = await autoApproveEnabled();
  const tags = body.tags
    ? String(body.tags)
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12)
    : [];

  try {
    const post = await Post.create({
      author: user._id,
      caption: sanitizeText(body.caption || '', 2000),
      images,
      venue: venue._id,
      group: groupId || undefined,
      semester: semester._id,
      tags,
      location: body.locationLabel ? { label: body.locationLabel } : undefined,
      communityConsent: true,
      copyrightConfirmation: true,
      moderationStatus: approve ? 'approved' : 'pending',
    });
    await User.findByIdAndUpdate(user._id, { $inc: { 'stats.posts': 1, 'stats.photos': images.length } });
    const populated = await Post.findById(post._id).populate(POST_POPULATE);
    return serializePost(populated, user);
  } catch (err) {
    await Promise.allSettled(images.map((img) => removeImage(img)));
    throw err;
  }
}

export async function listPosts(query, viewer) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 12, 30);
  const filter = { ...publicFilter() };
  if (query.venueId) filter.venue = query.venueId;
  if (query.groupId) filter.group = query.groupId;
  if (query.semesterId) filter.semester = query.semesterId;
  if (query.authorId) filter.author = query.authorId;
  if (query.featured === 'true') filter.featured = true;
  if (query.tag) filter.tags = query.tag.toLowerCase();

  const sort = query.sort === 'popular' ? { reactionCount: -1, createdAt: -1 } : { createdAt: -1 };
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Post.find(filter).populate(POST_POPULATE).sort(sort).skip(skip).limit(limit),
    Post.countDocuments(filter),
  ]);

  const ids = items.map((p) => p._id);
  let mine = [];
  if (viewer) {
    mine = await Reaction.find({ post: { $in: ids }, user: viewer._id });
  }
  const mineMap = new Map(mine.map((r) => [String(r.post), r.type]));

  return {
    items: items.map((p) => serializePost(p, viewer, { myReaction: mineMap.get(String(p._id)) || null })),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };
}

export async function getPost(id, viewer) {
  const filter = { _id: id };
  if (!viewer || (viewer.role !== 'admin' && viewer.role !== 'teacher')) {
    Object.assign(filter, publicFilter());
  }
  const post = await Post.findOne(filter).populate(POST_POPULATE);
  if (!post) throw new ApiError(404, 'Post not found.', 'NOT_FOUND');
  let myReaction = null;
  if (viewer) {
    const r = await Reaction.findOne({ post: post._id, user: viewer._id });
    myReaction = r?.type || null;
  }
  return serializePost(post, viewer, { myReaction });
}

export async function updatePost(user, id, body) {
  const post = await Post.findById(id);
  if (!post) throw new ApiError(404, 'Post not found.', 'NOT_FOUND');
  const isOwner = String(post.author) === String(user._id);
  const isMod = user.role === 'admin' || user.role === 'teacher';
  if (!isOwner && !isMod) throw new ApiError(403, 'You can only edit your own posts.', 'FORBIDDEN');
  if (body.caption !== undefined) post.caption = sanitizeText(body.caption, 2000);
  if (body.tags) post.tags = body.tags.map((t) => t.toLowerCase());
  if (body.visibility && isOwner) post.visibility = body.visibility;
  await post.save();
  const populated = await Post.findById(post._id).populate(POST_POPULATE);
  return serializePost(populated, user);
}

export async function deletePost(user, id, reason) {
  const post = await Post.findById(id);
  if (!post) throw new ApiError(404, 'Post not found.', 'NOT_FOUND');
  const isOwner = String(post.author) === String(user._id);
  const isMod = user.role === 'admin' || user.role === 'teacher';
  if (!isOwner && !isMod) throw new ApiError(403, 'You can only delete your own posts.', 'FORBIDDEN');
  await Promise.allSettled((post.images || []).map((img) => removeImage(img)));
  await Comment.deleteMany({ post: post._id });
  await Reaction.deleteMany({ post: post._id });
  await post.deleteOne();
  await User.findByIdAndUpdate(post.author, {
    $inc: { 'stats.posts': -1, 'stats.photos': -(post.images?.length || 0) },
  });
  if (isMod && !isOwner) {
    await writeAudit(user, 'post.delete', 'post', id, reason);
    await notify({
      recipient: post.author,
      actor: user._id,
      type: 'moderation',
      message: 'A moderator removed one of your photographs.',
    });
  }
}

export async function featurePost(actor, id, featured) {
  const post = await Post.findByIdAndUpdate(id, { featured }, { new: true }).populate(POST_POPULATE);
  if (!post) throw new ApiError(404, 'Post not found.', 'NOT_FOUND');
  await writeAudit(actor, featured ? 'post.feature' : 'post.unfeature', 'post', id);
  if (featured) {
    await notify({
      recipient: post.author,
      actor: actor._id,
      type: 'featured',
      post: post._id,
      message: 'Your photograph was featured by LFE Admin.',
    });
  }
  return serializePost(post, actor);
}

export async function setPostModeration(actor, id, moderationStatus, reason) {
  const post = await Post.findByIdAndUpdate(id, { moderationStatus }, { new: true }).populate(POST_POPULATE);
  if (!post) throw new ApiError(404, 'Post not found.', 'NOT_FOUND');
  await writeAudit(actor, 'post.moderate', 'post', id, reason, { moderationStatus });
  return serializePost(post, actor);
}
