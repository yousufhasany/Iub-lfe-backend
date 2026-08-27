import mongoose from 'mongoose';
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

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value) && String(new mongoose.Types.ObjectId(value)) === String(value);
}

function parseGroupNumber(value) {
  const n = Number(value);
  if (Number.isInteger(n) && n >= 1 && n <= 25) return n;
  return null;
}

async function ensureSemester(semesterId) {
  const slug = String(semesterId || '').match(/^(summer|winter)-(\d{4})$/);
  if (slug) {
    const season = slug[1];
    const year = Number(slug[2]);
    const maxYear = new Date().getFullYear() + 1;
    if (year < 1997 || year > maxYear) {
      throw new ApiError(400, 'Choose an LFE semester from 1997 onward.', 'INVALID_SEMESTER');
    }
    try {
      return await Semester.findOneAndUpdate(
        { season, year },
        { $setOnInsert: { season, year } },
        { upsert: true, new: true },
      );
    } catch (err) {
      if (err.code === 11000) return Semester.findOne({ season, year });
      throw err;
    }
  }
  if (!isObjectId(semesterId)) throw new ApiError(400, 'Semester not found.', 'NOT_FOUND');
  const semester = await Semester.findById(semesterId);
  if (!semester) throw new ApiError(404, 'Semester not found.', 'NOT_FOUND');
  return semester;
}

async function ensureGroup(number, semester, venue) {
  try {
    return await Group.findOneAndUpdate(
      { number, semester: semester._id, venue: venue._id },
      { $setOnInsert: { number, semester: semester._id, venue: venue._id } },
      { upsert: true, new: true },
    );
  } catch (err) {
    if (err.code === 11000) {
      return Group.findOne({ number, semester: semester._id, venue: venue._id });
    }
    throw err;
  }
}

export async function applyLfeAssignment(user, { semesterId, venueId, groupId } = {}) {
  if (!user.lfe) user.lfe = {};
  const groupNumber = parseGroupNumber(groupId);
  const semester = semesterId ? await ensureSemester(semesterId) : null;
  let venue = null;
  if (venueId) {
    venue = await Venue.findById(venueId);
    if (!venue) throw new ApiError(404, 'Venue not found.', 'NOT_FOUND');
  }

  if (groupNumber) {
    if (!semester) throw new ApiError(400, 'Choose an LFE semester.', 'SEMESTER_REQUIRED');
    if (!venue) throw new ApiError(400, 'Choose a venue.', 'VENUE_REQUIRED');
    const group = await ensureGroup(groupNumber, semester, venue);
    user.lfe.group = group._id;
    user.lfe.venue = venue._id;
    user.lfe.semester = semester._id;
    user.lfe.fieldVisitYear = semester.year;
    if (!group.members.some((id) => String(id) === String(user._id))) {
      group.members.push(user._id);
      await group.save();
    }
  } else if (groupId) {
    if (!isObjectId(groupId)) throw new ApiError(404, 'Group not found.', 'NOT_FOUND');
    const group = await Group.findById(groupId);
    if (!group) throw new ApiError(404, 'Group not found.', 'NOT_FOUND');
    user.lfe.group = group._id;
    user.lfe.venue = group.venue;
    user.lfe.semester = group.semester;
    const groupSemester = await Semester.findById(group.semester);
    if (groupSemester) user.lfe.fieldVisitYear = groupSemester.year;
    if (!group.members.some((id) => String(id) === String(user._id))) {
      group.members.push(user._id);
      await group.save();
    }
  } else {
    if (semester) {
      user.lfe.semester = semester._id;
      user.lfe.fieldVisitYear = semester.year;
    }
    if (venue) user.lfe.venue = venue._id;
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
