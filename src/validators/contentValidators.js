import { z } from 'zod';

const boolish = z
  .union([z.boolean(), z.string()])
  .transform((v) => v === true || v === 'true');

export const createPostSchema = z.object({
  body: z.object({
    caption: z.string().max(2000).optional(),
    venueId: z.string().optional(),
    groupId: z.string().optional(),
    semesterId: z.string().optional(),
    tags: z.string().optional(),
    locationLabel: z.string().max(120).optional(),
    communityConsent: boolish,
    copyrightConfirmation: boolish,
  }),
});

export const updatePostSchema = z.object({
  body: z.object({
    caption: z.string().max(2000).optional(),
    tags: z.array(z.string().max(40)).max(12).optional(),
    visibility: z.enum(['public', 'unlisted']).optional(),
  }),
});

export const commentSchema = z.object({
  body: z.object({
    body: z.string().min(1, 'Comment cannot be empty.').max(1000),
    parentId: z.string().optional(),
  }),
});

export const reactionSchema = z.object({
  body: z.object({
    type: z.enum(['like', 'love', 'smile', 'clap']).default('like'),
  }),
});

export const reportSchema = z.object({
  body: z.object({
    targetType: z.enum(['post', 'comment']),
    postId: z.string().optional(),
    commentId: z.string().optional(),
    reason: z.enum(['inappropriate', 'privacy', 'harassment', 'copyright', 'spam', 'misleading', 'other']),
    details: z.string().max(1000).optional(),
    removalRequest: z.boolean().optional(),
  }),
});
