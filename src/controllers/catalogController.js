import { asyncHandler, sendSuccess } from '../utils/api.js';
import * as venueService from '../services/venueService.js';
import * as semesterService from '../services/semesterService.js';
import * as groupService from '../services/groupService.js';

export const listVenues = asyncHandler(async (req, res) => {
  const venues = await venueService.listVenues();
  sendSuccess(res, { venues });
});

export const getVenue = asyncHandler(async (req, res) => {
  const data = await venueService.getVenueDetail(req.params.slug);
  sendSuccess(res, data);
});

export const createVenue = asyncHandler(async (req, res) => {
  const venue = await venueService.createVenue(req.user, req.body);
  sendSuccess(res, { venue }, 'Venue created.', 201);
});

export const updateVenue = asyncHandler(async (req, res) => {
  const venue = await venueService.updateVenue(req.user, req.params.id, req.body);
  sendSuccess(res, { venue }, 'Venue updated.');
});

export const deleteVenue = asyncHandler(async (req, res) => {
  await venueService.deleteVenue(req.user, req.params.id);
  sendSuccess(res, {}, 'Venue deleted.');
});

export const listSemesters = asyncHandler(async (req, res) => {
  const semesters = await semesterService.listSemesters();
  sendSuccess(res, { semesters });
});

export const getArchive = asyncHandler(async (req, res) => {
  const data = await semesterService.getArchive();
  sendSuccess(res, data);
});

export const getSemester = asyncHandler(async (req, res) => {
  const data = await semesterService.getSemesterDetail(req.params.season, req.params.year);
  sendSuccess(res, data);
});

export const createSemester = asyncHandler(async (req, res) => {
  const semester = await semesterService.createSemester(req.user, req.body);
  sendSuccess(res, { semester }, 'Semester created.', 201);
});

export const updateSemester = asyncHandler(async (req, res) => {
  const semester = await semesterService.updateSemester(req.user, req.params.id, req.body);
  sendSuccess(res, { semester }, 'Semester updated.');
});

export const listGroups = asyncHandler(async (req, res) => {
  const data = await groupService.listGroups({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 24,
    venueId: req.query.venueId,
    semesterId: req.query.semesterId,
  });
  sendSuccess(res, data);
});

export const getGroup = asyncHandler(async (req, res) => {
  const group = await groupService.getGroup(req.params.id);
  sendSuccess(res, { group });
});

export const createGroup = asyncHandler(async (req, res) => {
  const group = await groupService.createGroup(req.user, req.body);
  sendSuccess(res, { group }, 'Group created.', 201);
});

export const updateGroup = asyncHandler(async (req, res) => {
  const group = await groupService.updateGroup(req.user, req.params.id, req.body);
  sendSuccess(res, { group }, 'Group updated.');
});
