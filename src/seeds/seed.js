import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import mongoose from 'mongoose';
import { loadEnv, env } from '../config/env.js';
import { connectDb, disconnectDb } from '../config/db.js';
import { logger } from '../config/logger.js';
import { User, Venue, Semester, Group, Post, Comment, Reaction, PlatformSettings } from '../models/index.js';
import { OFFICIAL_VENUES } from './venues.js';
import { storeImage } from '../services/imageStorage/index.js';

loadEnv();

async function placeholderJpeg(label, color) {
  const svg = `<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="800" fill="${color}"/>
    <text x="50%" y="48%" text-anchor="middle" fill="white" font-size="42" font-family="Georgia, serif">${label}</text>
    <text x="50%" y="58%" text-anchor="middle" fill="#f3e8c2" font-size="22" font-family="sans-serif">IUB Live in Field Experience</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
}

async function seed() {
  await connectDb();
  logger.info('Seeding LFE platform…');

  await Promise.all([
    User.deleteMany({}),
    Venue.deleteMany({}),
    Semester.deleteMany({}),
    Group.deleteMany({}),
    Post.deleteMany({}),
    Comment.deleteMany({}),
    Reaction.deleteMany({}),
    PlatformSettings.deleteMany({}),
  ]);

  await PlatformSettings.create({ key: 'default', autoApprovePosts: true });

  const venueDocs = [];
  const coverColors = ['#1e3a5f', '#0f4c3a', '#7a3b2e', '#3d4f7c', '#5c3d2e', '#245c5c', '#4a3b6b', '#2e4a2e', '#6b3b4a', '#3b5c6b', '#5c4a24', '#2e3b5c', '#4b6040'];
  for (let i = 0; i < OFFICIAL_VENUES.length; i += 1) {
    const data = OFFICIAL_VENUES[i];
    const buffer = await placeholderJpeg(data.district, coverColors[i]);
    const cover = await storeImage(buffer, 'lfe/venues');
    venueDocs.push(await Venue.create({ ...data, coverImage: cover }));
  }

  const summer = await Semester.create({ year: 2026, season: 'summer', status: 'active' });
  const winter = await Semester.create({ year: 2025, season: 'winter', status: 'archived' });

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const admin = await User.create({
    email: env.adminEmail || 'admin@iub.edu.bd',
    passwordHash,
    role: 'admin',
    emailVerified: true,
    profile: { fullName: 'LFE Administrator', department: 'LFE Office' },
  });

  const teacher = await User.create({
    email: 'teacher.demo@iub.edu.bd',
    passwordHash,
    role: 'teacher',
    emailVerified: true,
    profile: { fullName: 'Dr. Nabila Rahman', department: 'LFE Faculty' },
  });

  const studentSeed = [
    { name: 'Md. Rahim Uddin', id: 'DEV001', dept: 'BBA', venue: 0, group: 7 },
    { name: 'Nazia Akter', id: 'DEV002', dept: 'Economics', venue: 0, group: 7 },
    { name: 'Farhan Chowdhury', id: 'DEV003', dept: 'CSE', venue: 4, group: 3 },
    { name: 'Sadia Islam', id: 'DEV004', dept: 'ENV', venue: 4, group: 3 },
    { name: 'Arif Hasan', id: 'DEV005', dept: 'BBA', venue: 10, group: 2 },
    { name: 'Maliha Khan', id: 'DEV006', dept: 'Media', venue: 2, group: 5 },
  ];

  const students = [];
  for (const s of studentSeed) {
    const venue = venueDocs[s.venue];
    students.push(
      await User.create({
        email: `${s.id.toLowerCase()}@demo.iub.edu.bd`,
        passwordHash,
        role: 'student',
        emailVerified: true,
        profile: {
          fullName: s.name,
          studentId: s.id,
          department: s.dept,
          batch: '2022',
          bio: `Development seed profile for ${s.name}. Not a real student.`,
        },
        lfe: { semester: summer._id, venue: venue._id, fieldVisitYear: 2026 },
      }),
    );
  }

  const groupDefs = [
    { number: 7, venue: 0, members: [0, 1], leader: 0 },
    { number: 3, venue: 4, members: [2, 3], leader: 2 },
    { number: 2, venue: 10, members: [4], leader: 4 },
    { number: 5, venue: 2, members: [5], leader: 5 },
  ];

  const groups = [];
  for (const g of groupDefs) {
    const members = g.members.map((i) => students[i]._id);
    const group = await Group.create({
      number: g.number,
      semester: summer._id,
      venue: venueDocs[g.venue]._id,
      leader: students[g.leader]._id,
      members,
      teachers: [teacher._id],
      description: `Development Group ${String(g.number).padStart(2, '0')} — fake data only.`,
    });
    groups.push(group);
    await User.updateMany({ _id: { $in: members } }, { 'lfe.group': group._id });
  }

  const captions = [
    'Working with local farmers during our field visit.',
    'Morning walk through the village after group briefing.',
    'Learning how the community organizes seasonal work.',
    'Our group at the learning centre before heading out.',
  ];

  for (let i = 0; i < students.length; i += 1) {
    const student = students[i];
    const group = groups.find((g) => g.members.some((m) => String(m) === String(student._id))) || groups[0];
    const buffer = await placeholderJpeg(`${student.profile.fullName.split(' ')[0]} · Field`, coverColors[i % coverColors.length]);
    const image = await storeImage(buffer, 'lfe/posts');
    const post = await Post.create({
      author: student._id,
      caption: captions[i % captions.length],
      images: [image],
      venue: student.lfe.venue,
      group: group._id,
      semester: summer._id,
      tags: ['lfe', 'field-visit', 'development-seed'],
      communityConsent: true,
      copyrightConfirmation: true,
      moderationStatus: 'approved',
      featured: i === 0,
    });
    await User.findByIdAndUpdate(student._id, { $inc: { 'stats.posts': 1, 'stats.photos': 1 } });
    if (i > 0) {
      await Comment.create({
        post: post._id,
        author: students[(i + 1) % students.length]._id,
        body: 'Thank you for sharing this memory from the field.',
      });
      post.commentCount = 1;
      await post.save();
    }
  }

  logger.info(
    {
      admin: admin.email,
      teacher: teacher.email,
      student: students[0].email,
      password: 'Password123!',
      venues: venueDocs.length,
    },
    'Seed complete (fake development data only)',
  );
  await disconnectDb();
}

seed().catch(async (err) => {
  logger.error(err, 'Seed failed');
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
