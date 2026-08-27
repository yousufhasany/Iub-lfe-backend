import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true },
    semester: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true },
    venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
    leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    description: { type: String, default: '' },
    photo: {
      url: String,
      thumbnailUrl: String,
      publicId: String,
    },
  },
  { timestamps: true },
);

groupSchema.index({ semester: 1, venue: 1, number: 1 }, { unique: true });
groupSchema.index({ members: 1 });

export const Group = mongoose.model('Group', groupSchema);
