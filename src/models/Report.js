import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['post', 'comment'], required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    comment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
    reason: {
      type: String,
      enum: [
        'inappropriate',
        'privacy',
        'harassment',
        'copyright',
        'spam',
        'misleading',
        'other',
      ],
      required: true,
    },
    details: { type: String, maxlength: 1000, default: '' },
    removalRequest: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['open', 'under_review', 'resolved', 'rejected'],
      default: 'open',
    },
    resolutionNote: String,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
  },
  { timestamps: true },
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reporter: 1, post: 1, comment: 1 });

export const Report = mongoose.model('Report', reportSchema);
