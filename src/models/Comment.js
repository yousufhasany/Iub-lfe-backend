import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, maxlength: 1000 },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    status: { type: String, enum: ['visible', 'removed'], default: 'visible' },
  },
  { timestamps: true },
);

commentSchema.index({ post: 1, createdAt: 1 });
commentSchema.index({ parent: 1 });
commentSchema.index({ author: 1 });

export const Comment = mongoose.model('Comment', commentSchema);
