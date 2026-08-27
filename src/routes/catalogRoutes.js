import { Router } from 'express';
import * as catalog from '../controllers/catalogController.js';
import { optionalAuth, requireAuth, requireRoles } from '../middleware/auth.js';

const staff = [requireAuth, requireRoles('teacher', 'admin')];

export const venueRoutes = Router();
venueRoutes.get('/', optionalAuth, catalog.listVenues);
venueRoutes.get('/:slug', optionalAuth, catalog.getVenue);
venueRoutes.post('/', ...staff, catalog.createVenue);
venueRoutes.patch('/:id', ...staff, catalog.updateVenue);
venueRoutes.delete('/:id', requireAuth, requireRoles('admin'), catalog.deleteVenue);

export const semesterRoutes = Router();
semesterRoutes.get('/', optionalAuth, catalog.listSemesters);
semesterRoutes.get('/archive', optionalAuth, catalog.getArchive);
semesterRoutes.get('/:season/:year', optionalAuth, catalog.getSemester);
semesterRoutes.post('/', ...staff, catalog.createSemester);
semesterRoutes.patch('/:id', ...staff, catalog.updateSemester);

export const groupRoutes = Router();
groupRoutes.get('/', optionalAuth, catalog.listGroups);
groupRoutes.get('/:id', optionalAuth, catalog.getGroup);
groupRoutes.post('/', ...staff, catalog.createGroup);
groupRoutes.patch('/:id', ...staff, catalog.updateGroup);
