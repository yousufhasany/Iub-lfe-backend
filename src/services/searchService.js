import { Post } from '../models/Post.js';
import { User } from '../models/User.js';
import { Venue } from '../models/Venue.js';
import { Group } from '../models/Group.js';
import { Semester } from '../models/Semester.js';
import { serializeUser } from '../utils/serialize.js';
import { serializePost } from './postService.js';

export async function searchAll({ q, year, season, venueId, district, groupId, student, page = 1, limit = 12 }, viewer) {
  const query = (q || '').trim();
  const postFilter = { moderationStatus: 'approved', visibility: 'public' };
  if (venueId) postFilter.venue = venueId;
  if (groupId) postFilter.group = groupId;
  if (year || season) {
    const { Semester } = await import('../models/Semester.js');
    const semFilter = {};
    if (year) semFilter.year = Number(year);
    if (season) semFilter.season = season;
    const semesters = await Semester.find(semFilter).select('_id');
    postFilter.semester = { $in: semesters.map((s) => s._id) };
  }
  if (district) {
    const venues = await Venue.find({ district: new RegExp(district, 'i') }).select('_id');
    postFilter.venue = { $in: venues.map((v) => v._id) };
  }
  if (query) {
    const namedVenues = await Venue.find({
      $or: [
        { name: new RegExp(query, 'i') },
        { district: new RegExp(query, 'i') },
        { division: new RegExp(query, 'i') },
      ],
    }).select('_id');
    postFilter.$or = [
      { caption: new RegExp(query, 'i') },
      { tags: new RegExp(query, 'i') },
      { venue: { $in: namedVenues.map((v) => v._id) } },
    ];
  }
  if (student) {
    const users = await User.find({
      role: 'student',
      $or: [{ 'profile.fullName': new RegExp(student, 'i') }, { 'profile.studentId': new RegExp(student, 'i') }],
    }).select('_id');
    postFilter.author = { $in: users.map((u) => u._id) };
  }

  const skip = (page - 1) * limit;
  const [posts, postTotal, students, venues, groups] = await Promise.all([
    Post.find(postFilter)
      .populate('author', 'profile.fullName profile.avatar profile.studentId role')
      .populate('venue', 'name slug district')
      .populate('group', 'number')
      .populate('semester', 'year season')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Post.countDocuments(postFilter),
    query
      ? User.find({
          role: 'student',
          status: 'active',
          $or: [{ 'profile.fullName': new RegExp(query, 'i') }, { 'profile.studentId': new RegExp(query, 'i') }],
        })
          .limit(8)
      : [],
    query
      ? Venue.find({
          $or: [
            { name: new RegExp(query, 'i') },
            { district: new RegExp(query, 'i') },
            { division: new RegExp(query, 'i') },
          ],
        }).limit(8)
      : [],
    query
      ? Group.find({}).populate('venue', 'name slug district').populate('semester').limit(20)
      : [],
  ]);

  const groupMatches = query
    ? groups.filter((g) => {
        const n = String(g.number);
        return n === query.replace(/\D/g, '') || `group ${n}`.includes(query.toLowerCase());
      })
    : [];

  return {
    posts: {
      items: posts.map((p) => serializePost(p, viewer)),
      total: postTotal,
      page,
      pages: Math.ceil(postTotal / limit),
    },
    students: students.map((u) => serializeUser(u, viewer)),
    venues,
    groups: groupMatches.slice(0, 8),
  };
}

export async function explore(viewer) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const filter = { moderationStatus: 'approved', visibility: 'public' };
  const populate = [
    { path: 'author', select: 'profile.fullName profile.avatar profile.studentId role' },
    { path: 'venue', select: 'name slug district' },
    { path: 'group', select: 'number' },
    { path: 'semester', select: 'year season' },
  ];

  const [popularWeek, latest, featured, popularVenues, recentGroups] = await Promise.all([
    Post.find({ ...filter, createdAt: { $gte: weekAgo } }).populate(populate).sort({ reactionCount: -1 }).limit(8),
    Post.find(filter).populate(populate).sort({ createdAt: -1 }).limit(8),
    Post.find({ ...filter, featured: true }).populate(populate).sort({ createdAt: -1 }).limit(6),
    Post.aggregate([
      { $match: filter },
      { $group: { _id: '$venue', photos: { $sum: 1 } } },
      { $sort: { photos: -1 } },
      { $limit: 8 },
    ]),
    Group.find().sort({ updatedAt: -1 }).limit(6).populate('venue', 'name slug district').populate('semester'),
  ]);

  const venueIds = popularVenues.map((v) => v._id);
  const venueDocs = await Venue.find({ _id: { $in: venueIds } });
  const venueMap = new Map(venueDocs.map((v) => [String(v._id), v]));

  return {
    popularThisWeek: popularWeek.map((p) => serializePost(p, viewer)),
    latest: latest.map((p) => serializePost(p, viewer)),
    featured: featured.map((p) => serializePost(p, viewer)),
    popularVenues: popularVenues.map((v) => ({ venue: venueMap.get(String(v._id)), photos: v.photos })),
    recentGroups,
  };
}

export async function homePreview(viewer) {
  const filter = { moderationStatus: 'approved', visibility: 'public' };
  const populate = [
    { path: 'author', select: 'profile.fullName profile.avatar profile.studentId role' },
    { path: 'venue', select: 'name slug district' },
    { path: 'group', select: 'number' },
    { path: 'semester', select: 'year season' },
  ];

  const [venues, posts, semesters] = await Promise.all([
    Venue.find().sort({ district: 1, name: 1 }).select('name slug district').lean(),
    Post.find(filter).populate(populate).sort({ createdAt: -1 }).limit(6),
    Semester.find().sort({ year: -1, season: 1 }).limit(12).lean(),
  ]);

  const yearsMap = {};
  for (const semester of semesters) {
    if (!yearsMap[semester.year]) yearsMap[semester.year] = { year: semester.year, seasons: [] };
    yearsMap[semester.year].seasons.push(semester);
  }

  return {
    venues,
    posts: posts.map((post) => serializePost(post, viewer)),
    archive: { years: Object.values(yearsMap) },
  };
}
