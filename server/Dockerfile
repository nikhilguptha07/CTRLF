# ====================================================================
# CONTROL F — AI Object Detection & Recovery System
# Multi-stage Production Dockerfile
# ====================================================================

FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src
RUN npm run build

# --------------------------------------------------------------------
# Production Runtime Stage
# --------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Install FFmpeg for video keyframe extraction
RUN apk add --no-cache ffmpeg

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY scripts/ ./scripts

# Create uploads storage directories
RUN mkdir -p uploads/videos uploads/frames uploads/evidence

EXPOSE 5000

CMD ["node", "dist/index.js"]
