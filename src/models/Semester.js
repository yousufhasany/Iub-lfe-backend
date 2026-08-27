import mongoose from 'mongoose';

const semesterSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true },
    season: { type: String, enum: ['summer', 'winter'], required: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    startsAt: Date,
    endsAt: Date,
  },
  { timestamps: true },
);

semesterSchema.index({ year: 1, season: 1 }, { unique: true });
semesterSchema.virtual('label').get(function label() {
  const season = this.season === 'summer' ? 'Summer' : 'Winter';
  return `${season} ${this.year}`;
});
semesterSchema.virtual('slug').get(function slug() {
  return `${this.season}-${this.year}`;
});
semesterSchema.set('toJSON', { virtuals: true });
semesterSchema.set('toObject', { virtuals: true });

export const Semester = mongoose.model('Semester', semesterSchema);
