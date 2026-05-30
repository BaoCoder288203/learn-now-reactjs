# Learn Now — TOEIC Practice (Frontend)

React + Vite UI for the TOEIC practice platform. The API lives in the separate **[learn-now-nodejs](../learn-now-nodejs)** repository.

## Run locally

**Prerequisites:** Node.js 20+, API server running on port 4000

### 1. Start the API (separate repo)

```bash
cd ../learn-now-nodejs
npm install
cp .env.example .env
npx prisma db push
npm run dev
```

### 2. Start the frontend

```bash
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to `http://localhost:4000`.

## Environment

Copy `.env.example` to `.env.local` if needed:

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Full API base URL (production). Leave empty in dev to use proxy. |
| `VITE_API_PROXY_TARGET` | Proxy target in dev (default `http://localhost:4000`) |

## Production build

```bash
VITE_API_URL=https://your-api.example.com npm run build
```

Serve the `dist/` folder with any static host. Set `CORS_ORIGIN` on the API to your frontend URL.

## Demo accounts

See the API README (`learn-now-nodejs`): `user@toeic.com` / `user123`, `admin@toeic.com` / `admin123`.
