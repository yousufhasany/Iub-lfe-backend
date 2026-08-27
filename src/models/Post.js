import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    thumbnailUrl: String,
    webpUrl: String,
    publicId: String,
    width: Number,
    height: Number,
    alt: { type: String, default: '' },
  },
  { _id: false },
);

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    caption: { type: String, default: '', maxlength: 2000 },
    images: { type: [imageSchema], validate: [(v) => v.length > 0 && v.length <= 10, '1-10 images required'] },
    venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    semester: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    location: {
      lat: Number,
      lng: Number,
      label: String,
    },
    visibility: { type: String, enum: ['public', 'unlisted'], default: 'public' },
    moderationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'removed'],
      default: 'approved',
    },
    featured: { type: Boolean, default: false },
    communityConsent: { type: Boolean, required: true },
    copyrightConfirmation: { type: Boolean, required: true },
    reactionCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    reactionBreakdown: {
      like: { type: Number, default: 0 },
      love: { type: Number, default: 0 },
      smile: { type: Number, default: 0 },
      clap: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ venue: 1, createdAt: -1 });
postSchema.index({ group: 1, createdAt: -1 });
postSchema.index({ semester: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ featured: 1, createdAt: -1 });
postSchema.index({ moderationStatus: 1, visibility: 1, createdAt: -1 });
postSchema.index({ caption: 'text', tags: 'text' });

export const Post = mongoose.model('Post', postSchema);
