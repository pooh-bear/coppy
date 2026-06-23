# Coppy 📎

> Like Clippy, but unhinged.

**Coppy** is a self-hosted expiring clipboard app. Push content to it via API, and it shows up in a clean web UI with auto-expiry. Perfect for when an AI assistant (like Openclaw) needs to get someting to your clipboard, but you don't want to give it carte blanche access.

## Features

- 📋 **REST API** — push clipboard items programmatically
- ⏱️ **Auto-expiry** — items vanish after a configurable TTL (default: 1h, max: 24h)
- 🎨 **Clean UI** — view, copy, and manage clipboard items in a web app
- 🔗 **Shareable links** — each clip gets a direct URL
- 🔍 **Search** — filter clips by title or content live in the UI
- 🐳 **Docker-ready** — runs with `docker compose up`
- 🚪 **Cloudflare Access ready** — no auth in-app, secure at the edge

## Quick Start

### With bundled Redis (standalone)

If you don't have a Redis instance handy, use the standalone compose file:

```bash
docker compose -f docker-compose.standalone.yml up -d
```

### Connecting to an existing Redis

Edit `docker-compose.yml` to point `REDIS_URL` to your Redis and attach to its network.

```bash
docker compose up -d
```

Open http://localhost:8712 — empty clipboard, ready for action.

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

Instruct your agent (eg. Openclaw skills) to push clips using the curl_exec tool or any HTTP tool:

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
| `COPPY_API_TOKEN` | (empty) | API token for write operations. If set, POST/DELETE require `Authorization: Bearer <token>`. Leave empty for open-access dev mode. |

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

## Why Coppy? — "Why not just paste it in the chat?"

Fair question! Here&rsquo;s why Coppy exists:

> You can paste content in chat, but clearly you&rsquo;ve never had to deal with
> trying to wrangle finding, copying, and pasting a draft email your agent
> created 18 hours ago and several dozen messages back. This is easier, trust me.

**Reasons it wins:**

- 🔍 **Search** — type a keyword to find that clip from yesterday (try doing that in chat history)
- ⏱️ **Auto-expiry** — no need to remember to clean up; things vanish on their own
- 📋 **One-click copy** — no selecting, scrolling, or triple-clicking
- 🔗 **Shareable links** — open a clip in its own page, keep it handy
- 🧹 **No noise** — your clipboard in one place, not buried in a thousand messages

## Tunneling & Edge Security

Coppy is designed to run behind a reverse tunnel — no public ports, no exposed attack surface.

### Cloudflare Tunnel + Access (recommended)

```bash
# Install cloudflared on your server
# Create a tunnel pointing at localhost:8712
cloudflared tunnel create coppy

# Configure DNS
cloudflared tunnel route dns coppy coppy.your.domain

# Add Access policy (optional but recommended)
# Cloudflare Dashboard > Access > Applications > Add app
# Protect *.your.domain with an identity provider or bypassed IPs
```

**In docker-compose.yml**, set:
```yaml
- APP_URL=https://coppy.your.domain
```

Coppy has no built-in authentication for the web UI — it assumes Cloudflare Access (or equivalent) handles auth at the edge. The API token (`COPPY_API_TOKEN`) protects write operations from agents.

### Tailscale (alternative)

If you prefer Tailscale over Cloudflare:

```bash
# Install Tailscale on your server
# Serve Coppy via Tailscale Funnel or share to your tailnet
tailscale serve --bg --https 443 http://localhost:3000

# Or share to your tailnet only (no public internet)
tailscale serve --bg http://localhost:3000
```

**In docker-compose.yml**, set:
```yaml
- APP_URL=https://coppy.tailnet-name.ts.net
```

### Why a tunnel?

| Approach | Pros | Cons |
|----------|------|------|
| Direct VPS + reverse proxy | Full control, familiar | Public IP, port scanning, cert management |
| Cloudflare Tunnel | No open ports, built-in DDoS, Access policies | Depends on Cloudflare |
| Tailscale Funnel | Private by default, simple setup | Requires Tailscale on all clients |

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

## Credit
Built by [Gabe Palomares](https://gabe.pw) and their AI assistant, [Frisk](https://frisk.gabe.pw).

## License

MIT
