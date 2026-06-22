# Coppy 📎

> Like Clippy, but less unhinged.

**Coppy** is a self-hosted expiring clipboard app. Push content to it via API, and it shows up in a clean web UI with auto-expiry. Perfect for when an AI assistant (like me!) needs to put something on your clipboard.

## Features

- 📋 **REST API** — push clipboard items programmatically
- ⏱️ **Auto-expiry** — items vanish after a configurable TTL (default: 1h, max: 24h)
- 🎨 **Clean UI** — view, copy, and manage clipboard items in a web app
- 🔗 **Shareable links** — each clip gets a direct URL
- 🐳 **Docker-ready** — runs with `docker compose up`
- 🚪 **Cloudflare Access ready** — no auth in-app, secure at the edge

## Quick Start

```bash
# Clone and go
cd coppy
docker compose up -d
```

Open http://localhost:3000 — empty clipboard, ready for action.

## Usage

### Pushing a clip (via curl)

```bash
curl -X POST http://localhost:3000/api/clips \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello from Coppy!"}'
```

### With a title and custom TTL

```bash
curl -X POST http://localhost:3000/api/clips \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Email draft for client",
    "content": "Hi there,\n\nJust following up on our call...",
    "ttl": 7200
  }'
```

### Response

```json
{
  "id": "abc123def456",
  "url": "http://localhost:3000/clip/abc123def456",
  "expiresIn": 3600,
  "message": "Clip created successfully"
}
```

### API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST`  | `/api/clips` | Create a clip |
| `GET`   | `/api/clips` | List all active clips |
| `GET`   | `/api/clips/:id` | Get a specific clip |
| `DELETE`| `/api/clips/:id` | Delete a clip |

POST body fields:
- `content` (required) — text content
- `title` (optional) — display title
- `ttl` (optional) — time to live in seconds (60–86400, default 3600)

### AI Assistant Integration

From Frisk/OpenClaw, push clips using the curl_exec tool or any HTTP tool:

```
curl -X POST https://coppy.your.domain/api/clips \
  -H "Content-Type: application/json" \
  -d '{"title":"Something to copy","content":"the text"}'
```

## Configuration

Via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://redis:6379` | Redis connection string |
| `APP_URL` | `http://localhost:3000` | Public URL (used in API responses) |
| `COPPY_DEFAULT_TTL` | `3600` | Default clip expiry in seconds (1h) |
| `COPPY_MAX_TTL` | `86400` | Maximum allowed TTL in seconds (24h) |

## Deployment

### Docker Compose (recommended)

```bash
docker compose up -d
```

### Behind Cloudflare Access

Deploy as-is, put Cloudflare Tunnel in front. No auth in-app — Access handles it at the edge.

### Standalone

```bash
# Need a Redis running locally
cp .env.example .env
npm install
npm run build
npm start
```

## Architecture

```
┌─────────────┐     POST/GET     ┌──────────┐     SET/GET     ┌───────┐
│  Frisk/AI   │ ──────────────► │  Coppy   │ ──────────────► │ Redis │
│  (curl/MCP) │                 │  (Next)  │                 │  (KV) │
└─────────────┘                 └──────────┘                 └───────┘
                                       │
                                       │ HTML
                                       ▼
                                 ┌──────────┐
                                 │  Browser │
                                 │  (Gabe)  │
                                 └──────────┘
```

- Redis handles TTL natively via `EXPIRE`
- Stale references cleaned up on read
- No database setup, no migration, no fuss

## License

MIT
