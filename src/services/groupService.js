import { Group } from '../models/Group.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/api.js';
import { writeAudit } from './auditService.js';

const POPULATE = [
  { path: 'semester' },
  { path: 'venue', select: 'name slug district division' },
  { path: 'leader', select: 'profile.fullName profile.avatar role' },
  { path: 'members', select: 'profile.fullName profile.avatar profile.studentId role stats' },
  { path: 'teachers', select: 'profile.fullName profile.avatar role' },
];

export async function listGroups({ page = 1, limit = 24, venueId, semesterId }) {
  const filter = {};
  if (venueId) filter.venue = venueId;
  if (semesterId) filter.semester = semesterId;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Group.find(filter).populate(POPULATE).sort({ number: 1 }).skip(skip).limit(limit),
    Group.countDocuments(filter),
  ]);
  return { items, page, limit, total, pages: Math.ceil(total / limit) };
}

export async function getGroup(id) {
  const group = await Group.findById(id).populate(POPULATE);
  if (!group) throw new ApiError(404, 'Group not found.', 'NOT_FOUND');
  return group;
}

export async function createGroup(actor, data) {
  const exists = await Group.findOne({
    semester: data.semesterId,
    venue: data.venueId,
    number: data.number,
  });
  if (exists) throw new ApiError(409, 'That group already exists for this venue and semester.', 'GROUP_EXISTS');
  const group = await Group.create({
    number: data.number,
    semester: data.semesterId,
    venue: data.venueId,
    description: data.description || '',
    teachers: data.teacherIds || [],
  });
  await writeAudit(actor, 'group.create', 'group', group._id);
  return getGroup(group._id);
}

export async function updateGroup(actor, id, data) {
  const group = await Group.findById(id);
  if (!group) throw new ApiError(404, 'Group not found.', 'NOT_FOUND');
  if (data.number !== undefined) group.number = data.number;
  if (data.description !== undefined) group.description = data.description;
  if (data.leaderId !== undefined) group.leader = data.leaderId || null;
  if (data.teacherIds) group.teachers = data.teacherIds;
  if (data.memberIds) {
    group.members = data.memberIds;
    await User.updateMany({ _id: { $in: data.memberIds } }, { 'lfe.group': group._id, 'lfe.venue': group.venue, 'lfe.semester': group.semester });
  }
  await group.save();
  await writeAudit(actor, 'group.update', 'group', id);
  return getGroup(id);
}
