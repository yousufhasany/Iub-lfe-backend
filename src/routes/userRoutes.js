import { Router } from 'express';
import * as users from '../controllers/userController.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema } from '../validators/authValidators.js';
import { upload } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimits.js';

const router = Router();

router.get('/students', optionalAuth, users.listStudents);
router.get('/students/:id', optionalAuth, users.getStudent);
router.patch('/me', requireAuth, validate(updateProfileSchema), users.updateMe);
router.post('/me/avatar', requireAuth, uploadLimiter, upload.single('avatar'), users.updateAvatar);

export default router;
