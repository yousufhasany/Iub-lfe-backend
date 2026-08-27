import { asyncHandler, sendSuccess } from '../utils/api.js';
import * as adminService from '../services/adminService.js';
import * as reportService from '../services/reportService.js';
import * as postService from '../services/postService.js';
import { listAuditLogs } from '../services/auditService.js';

export const stats = asyncHandler(async (req, res) => {
  const data = await adminService.dashboardStats();
  sendSuccess(res, data);
});

export const listUsers = asyncHandler(async (req, res) => {
  const data = await adminService.listUsers(req.query, req.user);
  sendSuccess(res, data);
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await adminService.adminCreateUser(req.user, req.body);
  sendSuccess(res, { user }, 'User created.', 201);
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await adminService.adminUpdateUser(req.user, req.params.id, req.body);
  sendSuccess(res, { user }, 'User updated.');
});

export const listReports = asyncHandler(async (req, res) => {
  const data = await reportService.listReports({
    status: req.query.status,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  sendSuccess(res, data);
});

export const resolveReport = asyncHandler(async (req, res) => {
  const report = await reportService.resolveReport(req.user, req.params.id, req.body);
  sendSuccess(res, { report }, 'Report updated.');
});

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await adminService.getSettings();
  sendSuccess(res, { settings });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await adminService.updateSettings(req.user, req.body);
  sendSuccess(res, { settings }, 'Settings saved.');
});

export const featurePost = asyncHandler(async (req, res) => {
  const post = await postService.featurePost(req.user, req.params.id, req.body.featured !== false);
  sendSuccess(res, { post });
});

export const moderatePost = asyncHandler(async (req, res) => {
  const post = await postService.setPostModeration(req.user, req.params.id, req.body.moderationStatus, req.body.reason);
  sendSuccess(res, { post });
});

export const listPosts = asyncHandler(async (req, res) => {
  const data = await adminService.listAdminPosts(req.query);
  sendSuccess(res, data);
});

export const listComments = asyncHandler(async (req, res) => {
  const data = await adminService.listAdminComments(req.query);
  sendSuccess(res, data);
});

export const auditLogs = asyncHandler(async (req, res) => {
  const data = await listAuditLogs({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 30,
  });
  sendSuccess(res, data);
});
