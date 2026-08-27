import { User } from '../models/User.js';
import { Semester } from '../models/Semester.js';
import { Group } from '../models/Group.js';
import { Venue } from '../models/Venue.js';
import { ApiError } from '../utils/api.js';
import { serializeUser } from '../utils/serialize.js';
import { removeImage, storeImage } from './imageStorage/index.js';

const PROFILE_POPULATE = [
  { path: 'lfe.semester' },
  { path: 'lfe.group', select: 'number venue semester' },
  { path: 'lfe.venue', select: 'name slug district' },
];

export async function applyLfeAssignment(user, { semesterId, venueId, groupId } = {}) {
  if (semesterId && !groupId) {
    const semester = await Semester.findById(semesterId);
    if (!semester) throw new ApiError(404, 'Semester not found.', 'NOT_FOUND');
    user.lfe.semester = semester._id;
    user.lfe.fieldVisitYear = semester.year;
  }
  if (venueId && !groupId) {
    const venue = await Venue.findById(venueId);
    if (!venue) throw new ApiError(404, 'Venue not found.', 'NOT_FOUND');
    user.lfe.venue = venue._id;
  }
  if (groupId) {
    const group = await Group.findById(groupId);
    if (!group) throw new ApiError(404, 'Group not found.', 'NOT_FOUND');
    user.lfe.group = group._id;
    user.lfe.venue = group.venue;
    user.lfe.semester = group.semester;
    const semester = await Semester.findById(group.semester);
    if (semester) user.lfe.fieldVisitYear = semester.year;
    if (!group.members.some((id) => String(id) === String(user._id))) {
      group.members.push(user._id);
      await group.save();
    }
  }
  await user.save();
  return user;
}

export async function getMe(user) {
  const fresh = await User.findById(user._id).populate(PROFILE_POPULATE);
  return serializeUser(fresh, fresh, { includeEmail: true });
}

export async function updateProfile(user, body) {
  const fresh = await User.findById(user._id);
  if (body.fullName) fresh.profile.fullName = body.fullName;
  if (body.studentId !== undefined) {
    if (body.studentId) {
      const taken = await User.findOne({ 'profile.studentId': body.studentId, _id: { $ne: user._id } });
      if (taken) throw new ApiError(409, 'This student ID is already registered.', 'STUDENT_ID_TAKEN');
    }
    fresh.profile.studentId = body.studentId;
  }
  if (body.department !== undefined) fresh.profile.department = body.department;
  if (body.batch !== undefined) fresh.profile.batch = body.batch;
  if (body.bio !== undefined) fresh.profile.bio = body.bio;
  if (body.fieldVisitYear !== undefined) fresh.lfe.fieldVisitYear = body.fieldVisitYear;
  if (body.semesterId || body.venueId || body.groupId) {
    await applyLfeAssignment(fresh, body);
  } else {
    await fresh.save();
  }
  return getMe(fresh);
}

export async function updateAvatar(user, file) {
  if (!file) throw new ApiError(400, 'Please choose a profile photograph.', 'IMAGE_REQUIRED');
  const stored = await storeImage(file.buffer, 'lfe/avatars');
  const fresh = await User.findById(user._id);
  if (fresh.profile.avatar?.publicId) {
    await removeImage(fresh.profile.avatar);
  }
  fresh.profile.avatar = stored;
  await fresh.save();
  return getMe(fresh);
}

export async function listStudents({ page = 1, limit = 20, q, venueId, semesterId, groupId }, viewer) {
  const filter = { role: 'student', status: 'active' };
  if (q) {
    filter.$or = [
      { 'profile.fullName': new RegExp(q, 'i') },
      { 'profile.studentId': new RegExp(q, 'i') },
    ];
  }
  if (venueId) filter['lfe.venue'] = venueId;
  if (semesterId) filter['lfe.semester'] = semesterId;
  if (groupId) filter['lfe.group'] = groupId;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(filter).populate(PROFILE_POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  return {
    items: items.map((u) => serializeUser(u, viewer)),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };
}

export async function getStudent(id, viewer) {
  const user = await User.findById(id).populate(PROFILE_POPULATE);
  if (!user || user.status !== 'active') throw new ApiError(404, 'Student not found.', 'NOT_FOUND');
  return serializeUser(user, viewer);
}
