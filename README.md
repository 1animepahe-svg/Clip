# Clipwave

**Your stream is already full of hits.**

Clipwave turns long streams into short, ready-to-post clips. Paste a Twitch, Kick, YouTube, TikTok or Instagram link (or upload a file), pick a window of up to 20 minutes, and Clipwave finds the moments, cuts them, frames them vertically and burns in captions. Every clip can then be edited in plain English and exported as a watermark-free MP4.

This is a complete, self-hostable application — not a landing-page demo. It ships with real auth, a job queue, ffmpeg rendering, an editor, analytics, exports and both dark and light themes. Every feature is free and unlimited: no plans, credits or billing.

---

## What's inside

| Area | Details |
| --- | --- |
| **Ingest** | Upload MP4/MOV/WebM (25 MB by default), add a Twitch/Kick/YouTube/TikTok/Instagram URL via `yt-dlp`, or try the built-in demo stream |
| **Scanning** | Guided scan or Quick Find, 20-minute window selector, six clips per scan (configurable), live progress polling, cancel — unlimited scans |
| **Moment picking** | AI transcript + LLM selection when an OpenAI key is set; local audio-energy heuristics otherwise |
| **Rendering** | ffmpeg previews and 1080p exports, 9:16 / 1:1 / 4:5 / 16:9, auto-pan / center / blur-fill reframe, burned-in captions |
| **Editor** | Trim, aspect, captions, reframe, title, "Ask Clipwave" natural-language edits, save + re-render |
| **Library** | Search, platform filters, sorting, save/bookmark, delete, per-clip preview modal |
| **Analytics** | 14-day output, platform split, scan quality, recent scans |
| **Accounts** | Email + password auth (scrypt, DB sessions, http-only cookies), profile, password change, account deletion |
| **Free** | No plans, credits, paywalls or card — every feature and every export is unlimited |
| **Legal** | `/terms` and `/privacy` pages with brand-matched styling |

### Pricing

There isn't any. Clipwave is free and unlimited for every account: unlimited scans, unlimited clips, unlimited exports, no
watermark and no card. There is nothing to upgrade and nothing to cancel.

---

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** with a hand-written glass design system (`src/app/globals.css`, `src/styles/`)
- **Prisma 6** + **SQLite** (swap the datasource for Postgres if you prefer)
- **ffmpeg / ffprobe** for probing, thumbnails and rendering
- **yt-dlp** (optional) for URL sources
- **OpenAI-compatible API** (optional) for transcription and moment selection
- **No payment provider** — there is nothing to pay for

---

## Requirements

- **Node.js 20+** (developed on Node 26)
- **ffmpeg + ffprobe** on `PATH` — or set `FFMPEG_PATH` / `FFPROBE_PATH`
- **yt-dlp** only if you want to add URL sources
- `npm`

No external database or cloud storage is required for local use: media lives in `./data`, and the database is a SQLite file.

---

## Quick start

```bash
git clone <your-repo-url> clipwave
cd clipwave
npm install

cp .env.example .env        # Windows: copy .env.example .env

npm run db:push             # create the SQLite schema
npm run demo:media          # generate the sample stream + clips (needs ffmpeg)
npm run seed                # optional: demo@clipwave.app / clipwave123

npm run dev                 # http://localhost:3000
```

Register a new account, or sign in with `demo@clipwave.app` / `clipwave123` after seeding.

The inline worker is enabled by default (`WORKER_INLINE=1`), so scans and exports run inside the web process. Nothing else needs to be started for local development.

---

## Environment variables

Copy `.env.example` to `.env`. Only the first three values are required.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `file:./data/clipwave.db` | SQLite path, resolved relative to `prisma/`. Use an absolute path such as `file:/data/clipwave.db` in production |
| `DATA_DIR` | `./data` | Where uploads, downloaded windows, clips, exports and thumbnails are stored |
| `APP_URL` | `http://localhost:3000` | Public base URL |
| `WORKER_INLINE` | `1` | `1` runs the queue in-process. Set `0` and run `npm run worker` to scale the worker separately |
| `CLIPS_PER_SCAN` | `6` | Default number of clips per scan (clamped to 3–10) |
| `MAX_UPLOAD_MB` | `25` | Upload limit |
| `OPENAI_API_KEY` | — | Enables transcription + LLM moment selection + AI editor |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Any OpenAI-compatible endpoint |
| `OPENAI_MODEL` | `gpt-4o-mini` | Moment selection / editor model |
| `TRANSCRIBE_MODEL` | `whisper-1` | Transcription model |
| `FFMPEG_PATH` / `FFPROBE_PATH` / `YTDLP_PATH` | binaries on `PATH` | Override binary locations |
| `SESSION_SECRET` | derived | Recommended in production for session-token derivation |

**Without an OpenAI key** Clipwave still works end to end: it skips transcription and selects moments using local audio loudness. No account ever needs a payment method or a hard limit.

---

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next dev server (inline worker) |
| `npm run build` | Prisma generate + production build (standalone output) |
| `npm start` | Start the production server |
| `npm run worker` | Run the standalone queue worker (with `WORKER_INLINE=0`) |
| `npm run dev:all` | Dev server + watched worker together |
| `npm run db:push` | Sync Prisma schema to SQLite |
| `npm run db:studio` | Prisma Studio |
| `npm run demo:media` | Regenerate `public/demo/*.mp4` with ffmpeg |
| `npm run seed` | Create/refresh the demo account |
| `npm run typecheck` | `tsc --noEmit` |

---

## How a scan runs

1. `POST /api/scans` validates the window and enqueues a `scan` job.
2. The worker opens the source. For local sources it reads the file; for URL sources it downloads **only the requested window** with `yt-dlp --download-sections`.
3. Audio is extracted to mono 16 kHz MP3. If AI is enabled it is transcribed; otherwise loudness is sampled per second with ffmpeg.
4. Moments are picked inside `[startSec, endSec]` — by the LLM when available, by energy peaks otherwise — and called clips are written to the DB as `rendering`.
5. Each clip is rendered with ffmpeg (vertical crop / blur fill, caption burn-in), thumbnailed, then marked `ready`.
6. Progress is stored on the scan row and polled by the UI. Cancelling sets a flag the worker checks between clips.

Exports re-render the current clip settings at 1080p and expose a download URL through the authenticated media endpoint.

---

## API overview

All routes are JSON and session-authenticated via the http-only `cw_session` cookie.

```
POST   /api/auth/register | login | logout | forgot | reset
GET    /api/auth/me
PATCH  /api/account          DELETE /api/account

GET    /api/sources          POST /api/sources        POST /api/upload
GET    /api/sources/:id      DELETE /api/sources/:id

GET    /api/scans            POST /api/scans
GET    /api/scans/:id        POST /api/scans/:id      # cancel

GET    /api/clips            POST /api/clips/:id/export
GET    /api/clips/:id        PATCH /api/clips/:id     DELETE /api/clips/:id
POST   /api/clips/:id/ask

GET    /api/stats

GET    /api/media/*          # authenticated Range-capable media streaming
```

Pages: `/`, `/login`, `/register`, `/forgot`, `/reset`, `/streams`, `/streams/:id`, `/library`, `/saved`, `/edit/:id`, `/analytics`, `/account`, `/terms`, `/privacy`.

---

## Deployment

### Docker (recommended for a VPS / Railway / Render / Fly.io)

The included `Dockerfile` builds a standalone image with ffmpeg and yt-dlp installed.

```bash
docker build -t clipwave .
docker run -p 3000:3000 \
  -v clipwave-data:/data \
  -e APP_URL=http://localhost:3000 \
  -e SESSION_SECRET=replace-me \
  clipwave
```

Or with Compose:

```bash
docker compose up -d --build
```

`docker-compose.yml` mounts a named volume at `/data` and points both `DATABASE_URL` and `DATA_DIR` there, so clips and the database survive restarts. The container runs `prisma db push` on boot.

**Important:** the `/data` volume holds every uploaded source, clip and export. Back it up, and mount it on persistent storage on whichever platform you use. If you run more than one replica, move the database to Postgres and give each replica its own writable media disk (or object storage).

### Railway / Render / Fly.io

1. Push this repo to GitHub.
2. Create a service from the repo and let it build the `Dockerfile`.
3. Add a persistent volume mounted at `/data`.
4. Set `DATABASE_URL=file:/data/clipwave.db`, `DATA_DIR=/data`, `APP_URL=https://your-domain`, and any optional keys.
5. Deploy. Run one replica unless you externalise the database and media.

### Vercel

Vercel is **not** a good fit for the worker as shipped: serverless functions cannot run ffmpeg reliably and do not provide persistent local disk. You can deploy the UI there only if you also host the worker on a machine with persistent storage and point both at a shared Postgres database and object storage — this repository does not include that split. Use the Docker route instead.

### Running the worker separately

```bash
# web
WORKER_INLINE=0 npm start
# worker (another process / container)
npm run worker
```

Both processes must share the same database and `DATA_DIR`.

---

## Project layout

```
prisma/
  schema.prisma            # User, Session, Source, Scan, Clip, Job, PasswordReset
src/
  app/
    (app)/                 # authenticated shell: streams, library, saved, edit, analytics, account
    (auth)/                # login, register, forgot, reset
    (legal)/               # terms, privacy
    api/                   # route handlers
  components/              # landing, app shell, clip grid, stream view, editor, account…
  lib/                     # env, db, auth, queue, media, ai, render, sources, dto
  styles/                  # landing.css, app.css
  worker/                  # queue worker + standalone CLI
  instrumentation.ts       # starts the inline worker
scripts/
  gen-demo-media.mjs       # regenerates public/demo media
  seed.ts                  # demo account
public/demo/               # sample stream + sample clips
```

---

## Security notes

- Passwords are hashed with `scrypt` and a per-user salt.
- Sessions are random 32-byte tokens stored in the database and set as http-only, `sameSite=lax` cookies.
- Media is never served from a public directory; `/api/media/*` checks ownership and supports HTTP Range requests.
- Set `SESSION_SECRET` in production and serve over HTTPS.

---

## License

MIT. The brand name, copy and demo media are original to this project.
