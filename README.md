# Coppy 📎

> Like Clippy, but unhinged. And actually useful. (Clippy could never.)

**Coppy** is a self-hosted, self-destructing clipboard. Push content to it over a REST API and it materializes in a clean web UI, hangs around for as long as you tell it to, then politely evaporates. Built for the very specific indignity of having an AI assistant (like Openclaw) produce something great and then needing to extract it from your chat history like it's a hostage negotiation — without handing your agent the keys to your actual system clipboard.

It looks like you're trying to copy something. Would you like help with that? (This time the answer is yes.)

## Features

- 📋 **REST API** — push clipboard items programmatically, no human required
- ⏱️ **Auto-expiry** — items vanish after a configurable TTL (default: 1h, max: 24h). Clips are mortal. It builds character.
- 🎨 **Clean UI** — view, copy, and manage clips in a web app that doesn't look like it was built in 2009
- 🔗 **Shareable links** — every clip gets its own URL, like a tiny celebrity
- 🔍 **Search** — filter clips by title or content live, as you type
- 🐳 **Docker-ready** — `docker compose up` and walk away
- 🚪 **Cloudflare Access ready** — no auth in-app, secured at the edge where it belongs

## Why Coppy? — "Why not just paste it in the chat?"

Fair question! Here's why Coppy earns its keep:

> You can paste content in chat, sure. But you've clearly never had the joy of
> scrolling back through several dozen messages and 18 hours of history to find,
> select, and copy that one draft email your agent wrote. This is easier. Trust me.

**Reasons it wins:**

- 🔍 **Search** — type a keyword, find yesterday's clip instantly (now try that in chat history without crying)
- ⏱️ **Auto-expiry** — no cleanup, no clutter, no guilt. Things leave on their own, like well-behaved houseguests
- 📋 **One-click copy** — no selecting, no scrolling, no rage-triple-clicking
- 🔗 **Shareable links** — open a clip in its own page and keep it handy
- 🧹 **No noise** — your clipboard lives in one calm place, not buried under a thousand messages

## Quick Start

### With bundled Redis (standalone)

No Redis lying around? The standalone compose file brings its own:

```bash
docker compose -f docker-compose.standalone.yml up -d
```

### Connecting to an existing Redis

Already have a Redis? Point `REDIS_URL` at it in `docker-compose.yml` and attach to its network.

```bash
docker compose up -d
```

Open http://localhost:8712 — an empty clipboard, brimming with potential.

## Usage

### Pushing a clip (via curl)

```bash
curl -X POST http://localhost:8712/api/clips \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello from Coppy!"}'
```

### With a title and custom TTL

```bash
curl -X POST http://localhost:8712/api/clips \
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
  "url": "http://localhost:8712/clip/abc123def456",
  "expiresIn": 3600,
  "message": "Clip created successfully"
}
```

### API Reference

| Method   | Path             | Description            |
|----------|------------------|------------------------|
| `POST`   | `/api/clips`     | Create a clip          |
| `GET`    | `/api/clips`     | List all active clips  |
| `GET`    | `/api/clips/:id` | Get a specific clip    |
| `DELETE` | `/api/clips/:id` | Delete a clip          |

POST body fields:
- `content` (required) — the text content
- `title` (optional) — display title
- `ttl` (optional) — time to live in seconds (60–86400, default 3600)

### AI Assistant Integration

Teach your agent (e.g. Openclaw skills) to push clips with the `curl_exec` tool or any HTTP tool:

```bash
curl -X POST https://coppy.your.domain/api/clips \
  -H "Content-Type: application/json" \
  -d '{"title":"Something to copy","content":"the text"}'
```

Your agent gets a drop box, not the whole house. Everyone sleeps better.

## Configuration

Via environment variables:

| Variable            | Default                | Description |
|---------------------|------------------------|-------------|
| `REDIS_URL`         | `redis://redis:6379`   | Redis connection string |
| `APP_URL`           | `http://localhost:8712`| Public URL (used in API responses) |
| `COPPY_DEFAULT_TTL` | `3600`                 | Default clip expiry in seconds (1h) |
| `COPPY_MAX_TTL`     | `86400`                | Maximum allowed TTL in seconds (24h) |
| `COPPY_API_TOKEN`   | (empty)                | API token for write operations. If set, `POST`/`DELETE` require `Authorization: Bearer <token>`. Leave empty for open-access dev mode (live dangerously, but only on localhost). |

## Deployment

### Docker Compose (recommended)

```bash
docker compose up -d
```

### Behind Cloudflare Access

Deploy as-is and put a Cloudflare Tunnel in front. No auth in-app — Access handles it at the edge, like a bouncer who actually checks IDs.

### Standalone

```bash
# Need a Redis running locally
cp .env.example .env
npm install
npm run build
npm start
```

## Tunneling & Edge Security

Coppy is designed to run behind a reverse tunnel — no public ports, no exposed attack surface, no 3 a.m. emails from your VPS provider.

### Cloudflare Tunnel + Access (recommended)

```bash
# Install cloudflared on your server
# Create a tunnel pointing at localhost:8712
cloudflared tunnel create coppy

# Configure DNS
cloudflared tunnel route dns coppy coppy.your.domain

# Add an Access policy (optional, but you'll want it)
# Cloudflare Dashboard > Access > Applications > Add app
# Protect *.your.domain with an identity provider or bypassed IPs
```

**In docker-compose.yml**, set:
```yaml
- APP_URL=https://coppy.your.domain
```

Coppy ships with zero built-in auth for the web UI — it assumes Cloudflare Access (or equivalent) is guarding the door. The API token (`COPPY_API_TOKEN`) keeps your agents honest on write operations.

### Tailscale (alternative)

Team Tailscale? Coppy doesn't judge:

```bash
# Install Tailscale on your server
# Serve Coppy via Tailscale Funnel or share to your tailnet
tailscale serve --bg --https 443 http://localhost:8712

# Or share to your tailnet only (no public internet)
tailscale serve --bg http://localhost:8712
```

**In docker-compose.yml**, set:
```yaml
- APP_URL=https://coppy.tailnet-name.ts.net
```

### Why a tunnel?

| Approach                    | Pros                                          | Cons |
|-----------------------------|-----------------------------------------------|------|
| Direct VPS + reverse proxy  | Full control, familiar                        | Public IP, port scanning, cert wrangling |
| Cloudflare Tunnel           | No open ports, built-in DDoS, Access policies | You're trusting Cloudflare |
| Tailscale Funnel            | Private by default, dead simple               | Requires Tailscale on all clients |

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

- Redis handles TTL natively via `EXPIRE` — the clips expire themselves, no cron job babysitting required
- Stale references get cleaned up on read
- No database, no migrations, no fuss

## Credit

Built by [Gabe Palomares](https://gabe.pw) and their AI assistant, [Frisk](https://frisk.gabe.pw). One of them wrote the jokes. We're not saying which.

## License

MIT — do whatever you want, just don't blame us when a clip expires at the worst possible moment.
