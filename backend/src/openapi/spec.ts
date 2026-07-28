import {
  createNotebookSchema,
  updateNotebookSchema,
  createSourceSchema,
  uploadIntentSchema,
  createConversationSchema,
  chatStreamSchema,
  cursorPaginationQuerySchema,
} from '../validators';

export function buildOpenApiSpec() {
  const zodToSchema = (schema: { _def?: unknown }) => ({
    type: 'object',
    description: 'Derived from Zod schema at runtime',
    'x-zod-schema': schema.constructor?.name || 'ZodObject',
  });

  return {
    openapi: '3.0.3',
    info: {
      title: 'ChaiBook LLM API',
      version: '1.0.0',
      description: 'RAG backend API with workspace-scoped notebooks, sources, and chat streaming.',
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ApiError: {
          type: 'object',
          required: ['success', 'code', 'message', 'requestId'],
          properties: {
            success: { type: 'boolean', enum: [false] },
            code: { type: 'string' },
            message: { type: 'string' },
            requestId: { type: 'string' },
            details: { type: 'object', additionalProperties: true },
          },
        },
        CreateNotebook: zodToSchema(createNotebookSchema),
        UpdateNotebook: zodToSchema(updateNotebookSchema),
        CreateSource: zodToSchema(createSourceSchema),
        UploadIntent: zodToSchema(uploadIntentSchema),
        CreateConversation: zodToSchema(createConversationSchema),
        ChatStream: zodToSchema(chatStreamSchema),
        CursorPagination: zodToSchema(cursorPaginationQuerySchema),
      },
      parameters: {
        IdempotencyKey: {
          name: 'Idempotency-Key',
          in: 'header',
          required: false,
          schema: { type: 'string', minLength: 8, maxLength: 128 },
        },
        Cursor: {
          name: 'cursor',
          in: 'query',
          schema: { type: 'string' },
        },
        Limit: {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/notebooks': {
        get: { summary: 'List notebooks', tags: ['Notebooks'] },
        post: {
          summary: 'Create notebook',
          tags: ['Notebooks'],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateNotebook' } } },
          },
        },
      },
      '/notebooks/{notebookId}/chat': {
        post: {
          summary: 'Stream grounded RAG chat (SSE)',
          tags: ['Chat'],
          parameters: [{ $ref: '#/components/parameters/IdempotencyKey' }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ChatStream' } } },
          },
          responses: {
            '200': { description: 'SSE token stream' },
            '429': { description: 'Rate limited or token budget exceeded', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          },
        },
      },
      '/notebooks/{notebookId}/sources': {
        post: {
          summary: 'Upload or ingest a source',
          tags: ['Sources'],
          parameters: [{ $ref: '#/components/parameters/IdempotencyKey' }],
          responses: {
            '202': { description: 'Accepted for ingestion' },
            '429': { description: 'Upload rate or concurrency limit', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          },
        },
      },
      '/notebooks/{notebookId}/conversations': {
        get: {
          summary: 'List notebook conversations (cursor paginated)',
          tags: ['Chat'],
          parameters: [{ $ref: '#/components/parameters/Cursor' }, { $ref: '#/components/parameters/Limit' }],
        },
        post: {
          summary: 'Create conversation',
          tags: ['Chat'],
          requestBody: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateConversation' } } },
          },
        },
      },
      '/conversations': {
        get: {
          summary: 'List workspace conversations (cursor paginated)',
          tags: ['Chat'],
          parameters: [{ $ref: '#/components/parameters/Cursor' }, { $ref: '#/components/parameters/Limit' }],
        },
      },
      '/conversations/{conversationId}/messages': {
        get: {
          summary: 'List conversation messages (cursor paginated)',
          tags: ['Chat'],
          parameters: [{ $ref: '#/components/parameters/Cursor' }, { $ref: '#/components/parameters/Limit' }],
        },
      },
      '/sources': {
        get: {
          summary: 'List workspace sources (cursor paginated)',
          tags: ['Sources'],
          parameters: [{ $ref: '#/components/parameters/Cursor' }, { $ref: '#/components/parameters/Limit' }],
        },
      },
      '/search': {
        get: {
          summary: 'Search notebooks, sources, and conversations',
          tags: ['Search'],
          parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string', minLength: 2 } }],
        },
      },
      '/me/settings': {
        get: { summary: 'Get user settings', tags: ['User'] },
        patch: { summary: 'Update user settings', tags: ['User'] },
      },
    },
  };
}
