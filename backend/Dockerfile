# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci --legacy-peer-deps
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Stage 2: Production execution stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci --only=production --legacy-peer-deps
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

RUN mkdir -p uploads && chown -R node:node /app

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/live || exit 1

CMD ["node", "dist/server.js"]
