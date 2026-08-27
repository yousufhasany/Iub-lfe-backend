import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['like', 'love', 'smile', 'clap'], required: true },
  },
  { timestamps: true },
);

reactionSchema.index({ post: 1, user: 1 }, { unique: true });
reactionSchema.index({ user: 1 });

export const Reaction = mongoose.model('Reaction', reactionSchema);
