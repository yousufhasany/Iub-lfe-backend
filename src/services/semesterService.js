import { Semester } from '../models/Semester.js';
import { Group } from '../models/Group.js';
import { Post } from '../models/Post.js';
import { Venue } from '../models/Venue.js';
import { ApiError } from '../utils/api.js';
import { writeAudit } from './auditService.js';

export async function listSemesters() {
  return Semester.find().sort({ year: -1, season: 1 });
}

export async function getSemesterBySlug(season, year) {
  const semester = await Semester.findOne({ season, year: Number(year) });
  if (!semester) throw new ApiError(404, 'Semester not found.', 'NOT_FOUND');
  return semester;
}

export async function getArchive() {
  const semesters = await Semester.find().sort({ year: -1, season: 1 });
  const venues = await Venue.find().sort({ district: 1 });
  const grouped = {};
  for (const s of semesters) {
    if (!grouped[s.year]) grouped[s.year] = { year: s.year, seasons: [] };
    grouped[s.year].seasons.push(s);
  }
  return { years: Object.values(grouped), venues };
}

export async function getSemesterDetail(season, year) {
  const semester = await getSemesterBySlug(season, year);
  const groups = await Group.find({ semester: semester._id }).populate('venue', 'name slug district').sort({ number: 1 });
  const postCount = await Post.countDocuments({
    semester: semester._id,
    moderationStatus: 'approved',
    visibility: 'public',
  });
  return { semester, groups, postCount };
}

export async function createSemester(actor, data) {
  const exists = await Semester.findOne({ year: data.year, season: data.season });
  if (exists) throw new ApiError(409, 'That semester already exists.', 'SEMESTER_EXISTS');
  const semester = await Semester.create(data);
  await writeAudit(actor, 'semester.create', 'semester', semester._id);
  return semester;
}

export async function updateSemester(actor, id, data) {
  const semester = await Semester.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!semester) throw new ApiError(404, 'Semester not found.', 'NOT_FOUND');
  await writeAudit(actor, 'semester.update', 'semester', id);
  return semester;
}
