import { Venue } from '../models/Venue.js';
import { Post } from '../models/Post.js';
import { Group } from '../models/Group.js';
import { Semester } from '../models/Semester.js';
import { ApiError } from '../utils/api.js';
import { slugify } from '../utils/crypto.js';
import { writeAudit } from './auditService.js';

export async function listVenues() {
  return Venue.find().sort({ district: 1, name: 1 });
}

export async function getVenueBySlug(slug) {
  const venue = await Venue.findOne({ slug });
  if (!venue) throw new ApiError(404, 'Venue not found.', 'NOT_FOUND');
  return venue;
}

export async function getVenueDetail(slug) {
  const venue = await getVenueBySlug(slug);
  const [groups, postCount, semesters] = await Promise.all([
    Group.find({ venue: venue._id }).populate('semester leader', 'year season profile.fullName number').sort({ number: 1 }),
    Post.countDocuments({ venue: venue._id, moderationStatus: 'approved', visibility: 'public' }),
    Semester.find().sort({ year: -1, season: 1 }),
  ]);
  return { venue, groups, postCount, semesters };
}

export async function createVenue(actor, data) {
  const slug = data.slug || slugify(data.district || data.name);
  const exists = await Venue.findOne({ slug });
  if (exists) throw new ApiError(409, 'A venue with this slug already exists.', 'SLUG_TAKEN');
  const venue = await Venue.create({ ...data, slug });
  await writeAudit(actor, 'venue.create', 'venue', venue._id);
  return venue;
}

export async function updateVenue(actor, id, data) {
  const venue = await Venue.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!venue) throw new ApiError(404, 'Venue not found.', 'NOT_FOUND');
  await writeAudit(actor, 'venue.update', 'venue', id);
  return venue;
}

export async function deleteVenue(actor, id) {
  const venue = await Venue.findByIdAndDelete(id);
  if (!venue) throw new ApiError(404, 'Venue not found.', 'NOT_FOUND');
  await writeAudit(actor, 'venue.delete', 'venue', id);
  return venue;
}
