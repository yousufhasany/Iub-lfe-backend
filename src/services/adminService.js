import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Venue } from '../models/Venue.js';
import { Semester } from '../models/Semester.js';
import { Group } from '../models/Group.js';
import { Post } from '../models/Post.js';
import { Comment } from '../models/Comment.js';
import { Reaction } from '../models/Reaction.js';
import { Report } from '../models/Report.js';
import { PlatformSettings } from '../models/PlatformSettings.js';
import { ApiError } from '../utils/api.js';
import { serializeUser } from '../utils/serialize.js';
import { writeAudit } from './auditService.js';

export async function dashboardStats() {
  const [
    totalStudents,
    totalTeachers,
    totalVenues,
    totalGroups,
    totalPosts,
    totalComments,
    totalReactions,
    openReports,
    activeUsers,
  ] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'teacher' }),
    Venue.countDocuments(),
    Group.countDocuments(),
    Post.countDocuments(),
    Comment.countDocuments({ status: 'visible' }),
    Reaction.countDocuments(),
    Report.countDocuments({ status: { $in: ['open', 'under_review'] } }),
    User.countDocuments({ lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
  ]);

  const photoAgg = await Post.aggregate([{ $project: { n: { $size: '$images' } } }, { $group: { _id: null, total: { $sum: '$n' } } }]);
  const uploadsBySemester = await Post.aggregate([
    { $group: { _id: '$semester', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 },
  ]);
  const semesters = await Semester.find({ _id: { $in: uploadsBySemester.map((s) => s._id) } });
  const semMap = new Map(semesters.map((s) => [String(s._id), s]));

  const uploadsByVenue = await Post.aggregate([
    { $group: { _id: '$venue', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 },
  ]);
  const venues = await Venue.find({ _id: { $in: uploadsByVenue.map((v) => v._id) } });
  const venueMap = new Map(venues.map((v) => [String(v._id), v]));

  const popularPosts = await Post.find({ moderationStatus: 'approved' })
    .sort({ reactionCount: -1 })
    .limit(5)
    .populate('author', 'profile.fullName')
    .populate('venue', 'name');

  return {
    totals: {
      students: totalStudents,
      teachers: totalTeachers,
      venues: totalVenues,
      groups: totalGroups,
      posts: totalPosts,
      photos: photoAgg[0]?.total || 0,
      comments: totalComments,
      reactions: totalReactions,
      reports: openReports,
      activeUsers,
    },
    uploadsBySemester: uploadsBySemester.map((s) => ({
      semester: semMap.get(String(s._id)),
      count: s.count,
    })),
    uploadsByVenue: uploadsByVenue.map((v) => ({
      venue: venueMap.get(String(v._id)),
      count: v.count,
    })),
    popularPosts,
  };
}

export async function listUsers({ page = 1, limit = 20, role, status, q }, viewer) {
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (q) {
    filter.$or = [
      { email: new RegExp(q, 'i') },
      { 'profile.fullName': new RegExp(q, 'i') },
      { 'profile.studentId': new RegExp(q, 'i') },
    ];
  }
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  return {
    items: items.map((u) => serializeUser(u, viewer, { includeEmail: true })),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };
}

export async function adminUpdateUser(actor, id, data) {
  const user = await User.findById(id).select('+passwordHash');
  if (!user) throw new ApiError(404, 'User not found.', 'NOT_FOUND');
  if (data.role) user.role = data.role;
  if (data.status) user.status = data.status;
  if (data.fullName) user.profile.fullName = data.fullName;
  if (data.password) user.passwordHash = await bcrypt.hash(data.password, 12);
  await user.save();
  await writeAudit(actor, 'user.update', 'user', id, data.reason, { role: data.role, status: data.status });
  return serializeUser(user, actor, { includeEmail: true });
}

export async function adminCreateUser(actor, data) {
  const exists = await User.findOne({ email: data.email.toLowerCase() });
  if (exists) throw new ApiError(409, 'Email already in use.', 'EMAIL_TAKEN');
  const user = await User.create({
    email: data.email.toLowerCase(),
    passwordHash: await bcrypt.hash(data.password, 12),
    role: data.role || 'student',
    emailVerified: true,
    profile: { fullName: data.fullName, studentId: data.studentId, department: data.department },
  });
  await writeAudit(actor, 'user.create', 'user', user._id);
  return serializeUser(user, actor, { includeEmail: true });
}

export async function getSettings() {
  return (
    (await PlatformSettings.findOne({ key: 'default' })) ||
    (await PlatformSettings.create({ key: 'default' }))
  );
}

export async function updateSettings(actor, data) {
  const settings = await getSettings();
  if (data.autoApprovePosts !== undefined) settings.autoApprovePosts = data.autoApprovePosts;
  if (data.requireIubEmail !== undefined) settings.requireIubEmail = data.requireIubEmail;
  if (data.siteName) settings.siteName = data.siteName;
  await settings.save();
  await writeAudit(actor, 'settings.update', 'settings', settings._id);
  return settings;
}

export async function listAdminPosts({ page = 1, limit = 20, status }) {
  const filter = {};
  if (status) filter.moderationStatus = status;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Post.find(filter)
      .populate('author', 'profile.fullName email')
      .populate('venue', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Post.countDocuments(filter),
  ]);
  return { items, page, limit, total, pages: Math.ceil(total / limit) };
}

export async function listAdminComments({ page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Comment.find()
      .populate('author', 'profile.fullName')
      .populate('post', 'caption')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Comment.countDocuments(),
  ]);
  return { items, page, limit, total, pages: Math.ceil(total / limit) };
}
