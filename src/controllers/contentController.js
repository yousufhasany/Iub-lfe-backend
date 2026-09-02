import { asyncHandler, sendSuccess } from '../utils/api.js';
import * as postService from '../services/postService.js';
import * as commentService from '../services/commentService.js';
import * as reactionService from '../services/reactionService.js';
import * as searchService from '../services/searchService.js';
import * as reportService from '../services/reportService.js';
import * as notificationService from '../services/notificationService.js';

export const createPost = asyncHandler(async (req, res) => {
  const post = await postService.createPost(req.user, req.body, req.files);
  sendSuccess(res, { post }, 'Photograph published.', 201);
});

export const listPosts = asyncHandler(async (req, res) => {
  const data = await postService.listPosts(req.query, req.user);
  sendSuccess(res, data);
});

export const getPost = asyncHandler(async (req, res) => {
  const post = await postService.getPost(req.params.id, req.user);
  sendSuccess(res, { post });
});

export const updatePost = asyncHandler(async (req, res) => {
  const post = await postService.updatePost(req.user, req.params.id, req.body);
  sendSuccess(res, { post }, 'Post updated.');
});

export const deletePost = asyncHandler(async (req, res) => {
  await postService.deletePost(req.user, req.params.id, req.body?.reason);
  sendSuccess(res, {}, 'Post removed.');
});

export const react = asyncHandler(async (req, res) => {
  const data = await reactionService.setReaction(req.user, req.params.id, req.body.type);
  sendSuccess(res, data);
});

export const unreact = asyncHandler(async (req, res) => {
  const data = await reactionService.removeReaction(req.user, req.params.id);
  sendSuccess(res, data);
});

export const listReactions = asyncHandler(async (req, res) => {
  const items = await reactionService.listPostReactions(req.params.id, req.user);
  sendSuccess(res, { items });
});

export const listComments = asyncHandler(async (req, res) => {
  const data = await commentService.listComments(
    req.params.id,
    { page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 20 },
    req.user,
  );
  sendSuccess(res, data);
});

export const addComment = asyncHandler(async (req, res) => {
  const comment = await commentService.addComment(req.user, req.params.id, req.body);
  sendSuccess(res, { comment }, 'Comment added.', 201);
});

export const updateComment = asyncHandler(async (req, res) => {
  const comment = await commentService.updateComment(req.user, req.params.id, req.body.body);
  sendSuccess(res, { comment }, 'Comment updated.');
});

export const deleteComment = asyncHandler(async (req, res) => {
  await commentService.deleteComment(req.user, req.params.id, req.body?.reason);
  sendSuccess(res, {}, 'Comment removed.');
});

export const search = asyncHandler(async (req, res) => {
  const data = await searchService.searchAll(req.query, req.user);
  sendSuccess(res, data);
});

export const explore = asyncHandler(async (req, res) => {
  const data = await searchService.explore(req.user);
  sendSuccess(res, data);
});

export const home = asyncHandler(async (req, res) => {
  const data = await searchService.homePreview(req.user);
  sendSuccess(res, data);
});

export const createReport = asyncHandler(async (req, res) => {
  const report = await reportService.createReport(req.user, req.body);
  sendSuccess(res, { report }, 'Report submitted. Thank you.', 201);
});

export const listNotifications = asyncHandler(async (req, res) => {
  const data = await notificationService.listNotifications(req.user, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  sendSuccess(res, data);
});

export const readNotification = asyncHandler(async (req, res) => {
  await notificationService.markRead(req.user, req.params.id);
  sendSuccess(res, {}, 'Marked as read.');
});

export const readAllNotifications = asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.user);
  sendSuccess(res, {}, 'All notifications marked as read.');
});
