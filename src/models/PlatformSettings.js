import mongoose from 'mongoose';

const platformSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'default' },
    autoApprovePosts: { type: Boolean, default: true },
    requireIubEmail: { type: Boolean, default: false },
    siteName: { type: String, default: 'IUB LFE' },
  },
  { timestamps: true },
);

export const PlatformSettings = mongoose.model('PlatformSettings', platformSettingsSchema);
