import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import { venueRoutes, semesterRoutes, groupRoutes } from './catalogRoutes.js';
import postRoutes, {
  commentRoutes,
  searchRoutes,
  exploreRoutes,
  reportRoutes,
  notificationRoutes,
} from './contentRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/venues', venueRoutes);
router.use('/semesters', semesterRoutes);
router.use('/groups', groupRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/search', searchRoutes);
router.use('/explore', exploreRoutes);
router.use('/reports', reportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

export default router;
