import { asyncHandler, sendSuccess } from '../utils/api.js';
import * as userService from '../services/userService.js';

export const updateMe = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user, req.body);
  sendSuccess(res, { user }, 'Profile updated.');
});

export const updateAvatar = asyncHandler(async (req, res) => {
  const user = await userService.updateAvatar(req.user, req.file);
  sendSuccess(res, { user }, 'Profile photograph updated.');
});

export const listStudents = asyncHandler(async (req, res) => {
  const data = await userService.listStudents(
    {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      q: req.query.q,
      venueId: req.query.venueId,
      semesterId: req.query.semesterId,
      groupId: req.query.groupId,
    },
    req.user,
  );
  sendSuccess(res, data);
});

export const getStudent = asyncHandler(async (req, res) => {
  const user = await userService.getStudent(req.params.id, req.user);
  sendSuccess(res, { user });
});
