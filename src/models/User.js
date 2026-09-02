import mongoose from 'mongoose';

const avatarSchema = new mongoose.Schema(
  {
    url: String,
    thumbnailUrl: String,
    publicId: String,
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    emailVerified: { type: Boolean, default: false },
    verificationTokenHash: { type: String, select: false },
    verificationExpires: Date,
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpires: Date,
    profile: {
      fullName: { type: String, required: true, trim: true },
      studentId: { type: String, trim: true, index: true, sparse: true },
      department: { type: String, trim: true },
      batch: { type: String, trim: true },
      bio: { type: String, maxlength: 500, default: '' },
      avatar: avatarSchema,
      coverImage: avatarSchema,
    },
    lfe: {
      semester: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester' },
      group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
      venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' },
      fieldVisitYear: Number,
    },
    stats: {
      posts: { type: Number, default: 0 },
      photos: { type: Number, default: 0 },
      reactionsReceived: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
    },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

userSchema.index({ 'profile.fullName': 'text', 'profile.studentId': 'text' });

export const User = mongoose.model('User', userSchema);
