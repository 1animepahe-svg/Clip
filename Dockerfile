# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Clipwave production image: Next.js standalone + ffmpeg + yt-dlp
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl ffmpeg yt-dlp \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# --- dependencies ----------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
# The postinstall hook runs `prisma generate`, so the schema must exist first.
COPY prisma ./prisma
RUN npm ci

# --- build -----------------------------------------------------------------
FROM deps AS build
COPY . .
# Never needs a live database; this only satisfies the Prisma datasource.
ENV DATABASE_URL=file:/tmp/clipwave-build.db
RUN npm run build

# --- runtime ---------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    WORKER_INLINE=1 \
    DATABASE_URL=file:/data/clipwave.db \
    DATA_DIR=/data
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma

RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 3000

# Create/upgrade the SQLite schema on boot, then start the standalone server.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node server.js"]
