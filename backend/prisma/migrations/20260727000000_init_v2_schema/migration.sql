-- AlterTable users: add supabaseSubject, provider, providerId
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "supabaseSubject" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'google';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "providerId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_supabaseSubject_key" ON "users"("supabaseSubject");

-- CreateTable workspaces
CREATE TABLE IF NOT EXISTS "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_slug_key" ON "workspaces"("slug");

-- CreateTable memberships
CREATE TABLE IF NOT EXISTS "memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "memberships_userId_workspaceId_key" ON "memberships"("userId", "workspaceId");

-- CreateTable user_settings
CREATE TABLE IF NOT EXISTS "user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_settings_userId_key" ON "user_settings"("userId");

-- AlterTable notebooks: add workspaceId, archivedAt, favoritedAt, deletedAt
ALTER TABLE "notebooks" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "notebooks" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "notebooks" ADD COLUMN IF NOT EXISTS "favoritedAt" TIMESTAMP(3);
ALTER TABLE "notebooks" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- AlterTable sources: add workspaceId, s3Key, stage, contentType, isIndexed, deletedAt
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "s3Key" TEXT;
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "stage" TEXT NOT NULL DEFAULT 'ready';
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "contentType" TEXT;
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "isIndexed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- AlterTable conversations: add workspaceId
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT NOT NULL DEFAULT 'default';

-- CreateTable ingestion_jobs
CREATE TABLE IF NOT EXISTS "ingestion_jobs" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "stage" TEXT NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "failureCode" TEXT,
    "failureDetail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingestion_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable ingestion_events
CREATE TABLE IF NOT EXISTS "ingestion_events" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingestion_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable message_citations
CREATE TABLE IF NOT EXISTS "message_citations" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "sourceId" TEXT,
    "chunkId" TEXT,
    "title" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "page" INTEGER,
    "score" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_citations_pkey" PRIMARY KEY ("id")
);

-- CreateTable generations
CREATE TABLE IF NOT EXISTS "generations" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generations_pkey" PRIMARY KEY ("id")
);

-- Add Foreign Keys safely if they don't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memberships_userId_fkey') THEN
        ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memberships_workspaceId_fkey') THEN
        ALTER TABLE "memberships" ADD CONSTRAINT "memberships_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_settings_userId_fkey') THEN
        ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ingestion_jobs_sourceId_fkey') THEN
        ALTER TABLE "ingestion_jobs" ADD CONSTRAINT "ingestion_jobs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ingestion_events_jobId_fkey') THEN
        ALTER TABLE "ingestion_events" ADD CONSTRAINT "ingestion_events_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ingestion_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'message_citations_messageId_fkey') THEN
        ALTER TABLE "message_citations" ADD CONSTRAINT "message_citations_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'generations_messageId_fkey') THEN
        ALTER TABLE "generations" ADD CONSTRAINT "generations_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
