import { Router } from 'express';
import { env } from '../config/env.js';
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
  const cloud = env.cloudinary;
  res.json({
    success: true,
    data: {
      status: 'ok',
      imageStorage: {
        provider: env.imageProvider,
        cloudinaryConfigured: Boolean(cloud.cloudName && cloud.apiKey && cloud.apiSecret),
        cloudName: cloud.cloudName || null,
      },
    },
  });
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
