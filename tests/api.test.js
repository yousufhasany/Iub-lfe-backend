import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import mongoose from 'mongoose';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { User, Venue, Semester, Group, Post, Comment, Reaction } from '../src/models/index.js';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';

process.env.JWT_SECRET = 'test-secret-please-change';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/lfe_test';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.IMAGE_STORAGE_PROVIDER = 'local';
process.env.NODE_ENV = 'test';

let mongo;
let app;

async function jpeg() {
  return sharp({
    create: { width: 400, height: 300, channels: 3, background: '#1e3a5f' },
  })
    .jpeg()
    .toBuffer();
}

async function makeUser(overrides = {}) {
  const passwordHash = await bcrypt.hash(overrides.password || 'Password123!', 10);
  return User.create({
    email: overrides.email || `user${Date.now()}@demo.iub.edu.bd`,
    passwordHash,
    role: overrides.role || 'student',
    emailVerified: true,
    profile: { fullName: overrides.fullName || 'Test Student', studentId: overrides.studentId },
    ...overrides.extra,
  });
}

describe('LFE API', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri();
    await mongoose.connect(mongo.getUri());
    app = createApp();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Venue.deleteMany({}),
      Semester.deleteMany({}),
      Group.deleteMany({}),
      Post.deleteMany({}),
      Comment.deleteMany({}),
      Reaction.deleteMany({}),
    ]);
  });

  it('registers and logs in a student', async () => {
    const register = await request(app).post('/api/auth/register').send({
      fullName: 'Rahim Demo',
      email: 'rahim@demo.iub.edu.bd',
      password: 'Password123!',
      studentId: 'TST001',
    });
    expect(register.status).toBe(201);
    expect(register.body.success).toBe(true);
    expect(register.body.data.user.email).toBe('rahim@demo.iub.edu.bd');
    expect(register.headers['set-cookie']).toBeTruthy();

    const login = await request(app).post('/api/auth/login').send({
      email: 'rahim@demo.iub.edu.bd',
      password: 'Password123!',
    });
    expect(login.status).toBe(200);
    expect(login.body.data.user.profile.fullName).toBe('Rahim Demo');
    expect(login.body.data.token).toBeTruthy();
  });

  it('authenticates with a bearer token when cookies are missing', async () => {
    const student = await makeUser({ email: 'iphone@demo.iub.edu.bd' });
    const login = await request(app).post('/api/auth/login').send({
      email: student.email,
      password: 'Password123!',
    });
    const token = login.body.data.token;
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(student.email);
  });

  it('resets a password after identity verification when email is not configured', async () => {
    const student = await makeUser({
      email: 'resetme@demo.iub.edu.bd',
      fullName: 'Reset Me',
      studentId: 'RST009',
    });
    const start = await request(app).post('/api/auth/forgot-password').send({
      email: student.email,
    });
    expect(start.status).toBe(200);
    expect(start.body.data.delivery).toBe('identity');

    const verify = await request(app).post('/api/auth/forgot-password').send({
      email: student.email,
      fullName: 'Reset Me',
      studentId: 'RST009',
    });
    expect(verify.status).toBe(200);
    expect(verify.body.data.resetToken).toBeTruthy();

    const reset = await request(app).post('/api/auth/reset-password').send({
      token: verify.body.data.resetToken,
      password: 'NewPass123!',
    });
    expect(reset.status).toBe(200);

    const oldLogin = await request(app).post('/api/auth/login').send({
      email: student.email,
      password: 'Password123!',
    });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app).post('/api/auth/login').send({
      email: student.email,
      password: 'NewPass123!',
    });
    expect(newLogin.status).toBe(200);
  });

  it('rejects invalid passwords', async () => {
    await makeUser({ email: 'rahim@demo.iub.edu.bd' });
    const res = await request(app).post('/api/auth/login').send({
      email: 'rahim@demo.iub.edu.bd',
      password: 'wrong-password',
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('blocks unauthenticated profile updates', async () => {
    const res = await request(app).patch('/api/users/me').send({ bio: 'hi' });
    expect(res.status).toBe(401);
  });

  it('enforces role permissions on admin user list', async () => {
    const student = await makeUser({ email: 's@demo.iub.edu.bd' });
    const login = await request(app).post('/api/auth/login').send({
      email: student.email,
      password: 'Password123!',
    });
    const cookie = login.headers['set-cookie'];
    const res = await request(app).get('/api/admin/users').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('creates, reads, updates, and deletes a post', async () => {
    const student = await makeUser({ email: 'poster@demo.iub.edu.bd' });
    const venue = await Venue.create({
      name: 'Proshika HRDC, Koitta, Manikganj',
      slug: 'manikganj',
      district: 'Manikganj',
      division: 'Dhaka',
    });
    const semester = await Semester.create({ year: 2026, season: 'summer' });
    const login = await request(app).post('/api/auth/login').send({
      email: student.email,
      password: 'Password123!',
    });
    const cookie = login.headers['set-cookie'];
    const img = await jpeg();

    const created = await request(app)
      .post('/api/posts')
      .set('Cookie', cookie)
      .field('caption', 'Working with local farmers during our field visit.')
      .field('venueId', String(venue._id))
      .field('semesterId', String(semester._id))
      .field('communityConsent', 'true')
      .field('copyrightConfirmation', 'true')
      .attach('images', img, 'field.jpg');
    expect(created.status).toBe(201);
    const postId = created.body.data.post.id;

    const read = await request(app).get(`/api/posts/${postId}`);
    expect(read.status).toBe(200);
    expect(read.body.data.post.caption).toMatch(/farmers/);

    const updated = await request(app)
      .patch(`/api/posts/${postId}`)
      .set('Cookie', cookie)
      .send({ caption: 'Updated caption from the field.' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.post.caption).toMatch(/Updated/);

    const other = await makeUser({ email: 'other@demo.iub.edu.bd' });
    const otherLogin = await request(app).post('/api/auth/login').send({
      email: other.email,
      password: 'Password123!',
    });
    const forbidden = await request(app)
      .delete(`/api/posts/${postId}`)
      .set('Cookie', otherLogin.headers['set-cookie']);
    expect(forbidden.status).toBe(403);

    const deleted = await request(app).delete(`/api/posts/${postId}`).set('Cookie', cookie);
    expect(deleted.status).toBe(200);
  });

  it('uses the student LFE assignment when venue is omitted', async () => {
    const venue = await Venue.create({ name: 'V', slug: 'v-profile', district: 'D', division: 'Dhaka' });
    const semester = await Semester.create({ year: 2026, season: 'summer' });
    const student = await makeUser({
      email: 'assigned@demo.iub.edu.bd',
      extra: { lfe: { venue: venue._id, semester: semester._id } },
    });
    const login = await request(app).post('/api/auth/login').send({
      email: student.email,
      password: 'Password123!',
    });
    const created = await request(app)
      .post('/api/posts')
      .set('Cookie', login.headers['set-cookie'])
      .field('caption', 'From my assigned venue.')
      .field('communityConsent', 'true')
      .field('copyrightConfirmation', 'true')
      .attach('images', await jpeg(), 'field.jpg');
    expect(created.status).toBe(201);
    expect(created.body.data.post.venue._id).toBe(String(venue._id));
    const me = await request(app).get('/api/auth/me').set('Cookie', login.headers['set-cookie']);
    expect(me.body.data.user.stats.photos).toBe(1);
  });

  it('toggles reactions and prevents duplicates', async () => {
    const author = await makeUser({ email: 'author@demo.iub.edu.bd' });
    const venue = await Venue.create({ name: 'V', slug: 'v', district: 'D', division: 'Dhaka' });
    const semester = await Semester.create({ year: 2026, season: 'summer' });
    const post = await Post.create({
      author: author._id,
      caption: 'Hello',
      images: [{ url: 'http://example.com/a.jpg' }],
      venue: venue._id,
      semester: semester._id,
      communityConsent: true,
      copyrightConfirmation: true,
    });
    const login = await request(app).post('/api/auth/login').send({
      email: author.email,
      password: 'Password123!',
    });
    const cookie = login.headers['set-cookie'];
    const first = await request(app).post(`/api/posts/${post._id}/reactions`).set('Cookie', cookie).send({ type: 'love' });
    expect(first.status).toBe(200);
    expect(first.body.data.myReaction).toBe('love');
    expect(first.body.data.reactionCount).toBe(1);

    const same = await request(app).post(`/api/posts/${post._id}/reactions`).set('Cookie', cookie).send({ type: 'love' });
    expect(same.body.data.myReaction).toBeNull();
    expect(same.body.data.reactionCount).toBe(0);
  });

  it('adds, edits, and deletes comments with authorization', async () => {
    const author = await makeUser({ email: 'c1@demo.iub.edu.bd' });
    const other = await makeUser({ email: 'c2@demo.iub.edu.bd' });
    const venue = await Venue.create({ name: 'V', slug: 'v2', district: 'D', division: 'Dhaka' });
    const semester = await Semester.create({ year: 2026, season: 'winter' });
    const post = await Post.create({
      author: author._id,
      caption: 'Hello',
      images: [{ url: 'http://example.com/a.jpg' }],
      venue: venue._id,
      semester: semester._id,
      communityConsent: true,
      copyrightConfirmation: true,
    });
    const login = await request(app).post('/api/auth/login').send({
      email: author.email,
      password: 'Password123!',
    });
    const cookie = login.headers['set-cookie'];
    const added = await request(app)
      .post(`/api/posts/${post._id}/comments`)
      .set('Cookie', cookie)
      .send({ body: 'Beautiful photograph from the village.' });
    expect(added.status).toBe(201);
    const commentId = added.body.data.comment.id;

    const edited = await request(app)
      .patch(`/api/comments/${commentId}`)
      .set('Cookie', cookie)
      .send({ body: 'Edited comment.' });
    expect(edited.body.data.comment.body).toBe('Edited comment.');

    const otherLogin = await request(app).post('/api/auth/login').send({
      email: other.email,
      password: 'Password123!',
    });
    const denied = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set('Cookie', otherLogin.headers['set-cookie']);
    expect(denied.status).toBe(403);

    const removed = await request(app).delete(`/api/comments/${commentId}`).set('Cookie', cookie);
    expect(removed.status).toBe(200);
  });

  it('rejects invalid and oversized uploads', async () => {
    const student = await makeUser({ email: 'up@demo.iub.edu.bd' });
    const venue = await Venue.create({ name: 'V', slug: 'v3', district: 'D', division: 'Dhaka' });
    const semester = await Semester.create({ year: 2026, season: 'summer' });
    const login = await request(app).post('/api/auth/login').send({
      email: student.email,
      password: 'Password123!',
    });
    const cookie = login.headers['set-cookie'];

    const invalid = await request(app)
      .post('/api/posts')
      .set('Cookie', cookie)
      .field('venueId', String(venue._id))
      .field('semesterId', String(semester._id))
      .field('communityConsent', 'true')
      .field('copyrightConfirmation', 'true')
      .attach('images', Buffer.from('not-an-image'), { filename: 'x.jpg', contentType: 'image/jpeg' });
    expect(invalid.status).toBeGreaterThanOrEqual(400);

    const tiny = await sharp({
      create: { width: 50, height: 50, channels: 3, background: '#000' },
    })
      .jpeg()
      .toBuffer();
    const small = await request(app)
      .post('/api/posts')
      .set('Cookie', cookie)
      .field('venueId', String(venue._id))
      .field('semesterId', String(semester._id))
      .field('communityConsent', 'true')
      .field('copyrightConfirmation', 'true')
      .attach('images', tiny, 'tiny.jpg');
    expect(small.status).toBe(400);
    expect(small.body.code).toBe('IMAGE_TOO_SMALL');
  });

  it('lets admins moderate posts and manage reports', async () => {
    const admin = await makeUser({ email: 'admin@demo.iub.edu.bd', role: 'admin', fullName: 'Admin' });
    const student = await makeUser({ email: 'st@demo.iub.edu.bd' });
    const venue = await Venue.create({ name: 'V', slug: 'v4', district: 'D', division: 'Dhaka' });
    const semester = await Semester.create({ year: 2026, season: 'summer' });
    const post = await Post.create({
      author: student._id,
      caption: 'Hello',
      images: [{ url: 'http://example.com/a.jpg' }],
      venue: venue._id,
      semester: semester._id,
      communityConsent: true,
      copyrightConfirmation: true,
    });
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: admin.email,
      password: 'Password123!',
    });
    const cookie = adminLogin.headers['set-cookie'];
    const moderated = await request(app)
      .post(`/api/admin/posts/${post._id}/moderate`)
      .set('Cookie', cookie)
      .send({ moderationStatus: 'removed', reason: 'Privacy complaint' });
    expect(moderated.status).toBe(200);
    expect(moderated.body.data.post.moderationStatus).toBe('removed');

    const studentLogin = await request(app).post('/api/auth/login').send({
      email: student.email,
      password: 'Password123!',
    });
    const reported = await request(app)
      .post('/api/reports')
      .set('Cookie', studentLogin.headers['set-cookie'])
      .send({ targetType: 'post', postId: String(post._id), reason: 'privacy', details: 'Please take down.' });
    expect(reported.status).toBe(201);

    const resolved = await request(app)
      .patch(`/api/admin/reports/${reported.body.data.report._id}`)
      .set('Cookie', cookie)
      .send({ status: 'resolved', resolutionNote: 'Removed', removeContent: true });
    expect(resolved.status).toBe(200);

    const suspended = await request(app)
      .patch(`/api/admin/users/${student._id}`)
      .set('Cookie', cookie)
      .send({ status: 'suspended', reason: 'Policy violation' });
    expect(suspended.body.data.user.status).toBe('suspended');
  });
});

describe('Vercel multipart restore', () => {
  it('rebuilds a readable stream from a buffered body', async () => {
    const { restoreMultipartRequest } = await import('../src/middleware/restoreMultipart.js');
    const body = Buffer.from('fake-multipart-bytes');
    const req = restoreMultipartRequest({
      headers: { 'content-type': 'multipart/form-data; boundary=abc' },
      method: 'POST',
      url: '/api/posts',
      body,
    });
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    expect(Buffer.concat(chunks).equals(body)).toBe(true);
    expect(req.method).toBe('POST');
  });

  it('leaves non-multipart requests unchanged', async () => {
    const { restoreMultipartRequest } = await import('../src/middleware/restoreMultipart.js');
    const original = { headers: { 'content-type': 'application/json' }, body: { a: 1 } };
    expect(restoreMultipartRequest(original)).toBe(original);
  });
});
