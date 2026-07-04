# Polyedro-abs

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Next.js, Hono, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Full-stack React framework
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Hono** - Lightweight, performant server framework
- **Node.js** - Runtime environment
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@Polyedro-abs/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Project Structure

```
Polyedro-abs/
├── apps/
│   ├── web/         # Frontend application (Next.js)
│   └── server/      # Backend API (Hono)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run dev:web`: Start only the web application
- `pnpm run dev:server`: Start only the server
- `pnpm run check-types`: Check TypeScript types across all apps

## Social post publish loop (dev)

Test UI: [http://localhost:3001/dashboard/posts](http://localhost:3001/dashboard/posts)

Flow: upload media → create post → publish → n8n webhook → callback → status updates in the UI.

See `docs/ngrok-tunnel.md` and `docs/cloudflare-tunnel.md` for exposing the API callback URL to n8n Cloud.

## Environment variables (never commit secrets)

Copy the example files and paste your values locally:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env.local
```

| Variable | App | Description |
|----------|-----|-------------|
| `DATABASE_URL` | server | Local dev: `file:./dev.db`. Production: `postgresql://...` |
| `CORS_ORIGIN` | server | Web origin, e.g. `http://localhost:3001` |
| `N8N_WEBHOOK_URL` | server | n8n webhook trigger URL (leave empty for mock mode) |
| `APP_PUBLIC_URL` | server | Public HTTPS URL for n8n callbacks (ngrok or production API URL) |
| `NEXT_PUBLIC_SERVER_URL` | web | API base URL, e.g. `http://localhost:3000` |

After editing env files:

```bash
pnpm install
pnpm --filter server db:push
pnpm dev
```
