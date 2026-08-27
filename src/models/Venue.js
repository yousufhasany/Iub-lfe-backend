import mongoose from 'mongoose';

const venueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    district: { type: String, required: true },
    division: { type: String, required: true },
    description: { type: String, default: '' },
    coverImage: {
      url: String,
      thumbnailUrl: String,
      publicId: String,
    },
    location: {
      lat: Number,
      lng: Number,
      address: String,
    },
    historicalNotes: { type: String, default: '' },
    visitCount: { type: Number, default: 0 },
    studentCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

venueSchema.index({ district: 1 });
venueSchema.index({ name: 'text', district: 'text', description: 'text' });

export const Venue = mongoose.model('Venue', venueSchema);
