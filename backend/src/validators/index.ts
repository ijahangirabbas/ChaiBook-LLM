import { z } from 'zod';

export const createNotebookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  color: z.enum(['indigo', 'green', 'blue', 'orange', 'purple', 'pink', 'teal']).optional(),
  icon: z.string().optional(),
});

export const updateNotebookSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(100, 'Title is too long').optional(),
  description: z.string().max(500, 'Description is too long').optional(),
  color: z.enum(['indigo', 'green', 'blue', 'orange', 'purple', 'pink', 'teal']).optional(),
  icon: z.string().optional(),
});

export const createSourceSchema = z.object({
  type: z.enum(['youtube', 'pdf', 'webpage', 'text', 'markdown', 'srt', 'vtt']).optional(),
  title: z.string().optional(),
  url: z.string().url('Invalid URL format').optional(),
  content: z.string().max(500_000, 'Content exceeds maximum size of 500KB').optional(),
});

export const uploadIntentSchema = z.object({
  filename: z.string().min(1, 'Filename is required').max(255),
  contentType: z.string().min(1).max(200).optional(),
});

export const createConversationSchema = z.object({
  title: z.string().min(1).max(100).optional(),
});

export const chatStreamSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(10_000, 'Message is too long (max 10,000 characters)'),
  conversationId: z.string().uuid('Invalid conversation ID').optional(),
  regenerate: z.boolean().optional(),
});

export const paginationQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? Math.min(parseInt(val, 10), 100) : 20)),
});

export const cursorPaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      const parsed = val ? parseInt(val, 10) : 20;
      if (Number.isNaN(parsed) || parsed < 1) return 20;
      return Math.min(parsed, 100);
    }),
});
