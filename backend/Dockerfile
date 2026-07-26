# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies (using legacy-peer-deps for LangChain compatibility)
RUN npm ci --legacy-peer-deps

# Copy source code and TypeScript config
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript to JavaScript in dist/
RUN npm run build

# Stage 2: Production execution stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production --legacy-peer-deps

# Copy compiled JavaScript output from builder stage
COPY --from=builder /app/dist ./dist

# Create uploads directory for temporary file processing
RUN mkdir -p uploads && chown -R node:node /app

USER node

EXPOSE 3001

CMD ["node", "dist/server.js"]
