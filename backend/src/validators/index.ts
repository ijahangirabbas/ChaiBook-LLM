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
  type: z.enum(['youtube', 'pdf', 'webpage', 'text', 'markdown', 'word', 'powerpoint', 'srt', 'vtt']),
  title: z.string().optional(),
  url: z.string().url('Invalid URL format').optional(),
  content: z.string().optional(),
});

export const chatStreamSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  conversationId: z.string().min(1).optional(),
});

export const paginationQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? Math.min(parseInt(val, 10), 100) : 20)),
});
