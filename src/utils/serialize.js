import { canViewFullStudentId, maskStudentId } from '../utils/mask.js';

const PUBLIC_USER_FIELDS = [
  '_id',
  'role',
  'status',
  'emailVerified',
  'profile',
  'lfe',
  'stats',
  'createdAt',
];

export function serializeUser(user, viewer = null, { includeEmail = false } = {}) {
  if (!user) return null;
  const doc = user.toObject ? user.toObject() : user;
  const showFullId = canViewFullStudentId(viewer, doc._id);
  const studentId = doc.profile?.studentId || null;

  const payload = {
    id: String(doc._id),
    role: doc.role,
    status: doc.status,
    emailVerified: doc.emailVerified,
    profile: {
      fullName: doc.profile?.fullName || '',
      studentId: showFullId ? studentId : maskStudentId(studentId),
      studentIdMasked: maskStudentId(studentId),
      department: doc.profile?.department || '',
      batch: doc.profile?.batch || '',
      bio: doc.profile?.bio || '',
      avatar: doc.profile?.avatar || null,
      coverImage: doc.profile?.coverImage || null,
    },
    lfe: {
      semester: doc.lfe?.semester || null,
      group: doc.lfe?.group || null,
      venue: doc.lfe?.venue || null,
      fieldVisitYear: doc.lfe?.fieldVisitYear || null,
    },
    stats: {
      posts: doc.stats?.posts || 0,
      photos: doc.stats?.photos || 0,
      reactionsReceived: doc.stats?.reactionsReceived || 0,
      comments: doc.stats?.comments || 0,
    },
    createdAt: doc.createdAt,
  };

  if (includeEmail || showFullId) {
    payload.email = doc.email;
  }

  return payload;
}

export function serializeUsers(users, viewer) {
  return users.map((u) => serializeUser(u, viewer));
}
