import { Router } from 'express';
import * as content from '../controllers/contentController.js';
import { optionalAuth, requireAuth, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createPostSchema,
  updatePostSchema,
  commentSchema,
  reactionSchema,
  reportSchema,
} from '../validators/contentValidators.js';
import { upload } from '../middleware/upload.js';
import {
  commentLimiter,
  reactionLimiter,
  searchLimiter,
  uploadLimiter,
  writeLimiter,
} from '../middleware/rateLimits.js';

const router = Router();

router.get('/', optionalAuth, content.listPosts);
router.post('/', requireAuth, uploadLimiter, writeLimiter, upload.array('images', 10), validate(createPostSchema), content.createPost);
router.get('/:id', optionalAuth, content.getPost);
router.patch('/:id', requireAuth, validate(updatePostSchema), content.updatePost);
router.delete('/:id', requireAuth, content.deletePost);

router.get('/:id/reactions', optionalAuth, content.listReactions);
router.post('/:id/reactions', requireAuth, reactionLimiter, validate(reactionSchema), content.react);
router.delete('/:id/reactions', requireAuth, reactionLimiter, content.unreact);

router.get('/:id/comments', optionalAuth, content.listComments);
router.post('/:id/comments', requireAuth, commentLimiter, validate(commentSchema), content.addComment);

export const commentRoutes = Router();
commentRoutes.patch('/:id', requireAuth, validate(commentSchema), content.updateComment);
commentRoutes.delete('/:id', requireAuth, content.deleteComment);

export const searchRoutes = Router();
searchRoutes.get('/', searchLimiter, optionalAuth, content.search);

export const exploreRoutes = Router();
exploreRoutes.get('/', optionalAuth, content.explore);

export const reportRoutes = Router();
reportRoutes.post('/', requireAuth, validate(reportSchema), content.createReport);

export const notificationRoutes = Router();
notificationRoutes.get('/', requireAuth, content.listNotifications);
notificationRoutes.post('/read-all', requireAuth, content.readAllNotifications);
notificationRoutes.post('/:id/read', requireAuth, content.readNotification);

export default router;
