import { Router } from 'express';
import * as admin from '../controllers/adminController.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRoles('admin', 'teacher'));

router.get('/stats', admin.stats);
router.get('/posts', admin.listPosts);
router.get('/comments', admin.listComments);
router.get('/reports', admin.listReports);
router.patch('/reports/:id', admin.resolveReport);
router.post('/posts/:id/feature', admin.featurePost);
router.post('/posts/:id/moderate', admin.moderatePost);

router.use(requireRoles('admin'));
router.get('/users', admin.listUsers);
router.post('/users', admin.createUser);
router.patch('/users/:id', admin.updateUser);
router.get('/settings', admin.getSettings);
router.patch('/settings', admin.updateSettings);
router.get('/audit-logs', admin.auditLogs);

export default router;
