# Deposit Calculator

A fast, privacy-friendly **bank deposit calculator** built as an installable Progressive Web App (PWA). It simulates deposit growth day by day and shows period-by-period details, an effective annual rate, and a growth chart. All calculations run entirely in your browser — no data ever leaves your device.

## Features

- **Compound interest** with a day-by-day simulation using the actual/actual day-count convention (365/366, leap-year aware).
- **Flexible capitalization** frequencies: daily, weekly, twice a month, three times a month, monthly, quarterly, semi-annual, annual — all anchored to the deposit's start date.
- **Fixed or variable rates** — define rate periods by date ranges with full coverage validation.
- **Top-ups (contributions)** — recurring (monthly/quarterly/annual) or one-time on specific dates, with optional per-contribution tax.
- **Withdrawals** — recurring or one-time, clamped to the available balance.
- **Income tax** handling, applied per capitalization event (with sensible defaults for long-term deposits).
- **Detail views** — "balance changes only" (default), day, month, quarter, or year, plus CSV export.
- **Summary metrics** — final balance, net income, total tax, effective annual rate, total rate, and total annual rate.
- **Internationalization** — English and Russian, with locale-aware number and date formatting.
- **Light / dark theme** with persistence.
- **Installable PWA** — works offline and can be added to a phone's home screen.

## Tech stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite 6](https://vite.dev/) build tooling and [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [Recharts](https://recharts.org/) for the growth chart
- [date-fns](https://date-fns.org/) for date math
- [react-i18next](https://react.i18next.com/) for localization
- [Vitest](https://vitest.dev/) for unit tests (calculation engine)

## Getting started (local development)

Prerequisites: **Node.js 20+** and npm.

```bash
# Install dependencies
npm install

# Start the dev server (http://localhost:5173)
npm run dev
```

### Available scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with hot reload. |
| `npm run build` | Type-check and build the production bundle into `dist/`. |
| `npm run preview` | Serve the production build locally (http://localhost:4173). |
| `npm test` | Run the unit test suite once. |
| `npm run test:watch` | Run tests in watch mode. |
| `npm run lint` | Type-check the project without emitting output. |
| `npm run lint:eslint` | Run ESLint across the codebase. |
| `npm run lint:fix` | Run ESLint and auto-fix problems (including formatting). |

## Running with Docker

The repository ships with a multi-stage `Dockerfile` (Node build stage → Nginx runtime) and a `docker-compose.yml`.

### Quick start

```bash
# Build and start in the background
docker compose up -d --build
```

The app is published on **loopback only** (`127.0.0.1`) and defaults to host port **8080**, so it is intended to sit behind a reverse proxy.

### Custom port

The host port is configurable via the `HOST_PORT` environment variable:

```bash
# Inline
HOST_PORT=8123 docker compose up -d --build

# …or copy the example env file and edit it
cp .env.example .env   # then set HOST_PORT=8123
docker compose up -d --build
```

### Behind an Nginx reverse proxy

Because the container binds to `127.0.0.1:${HOST_PORT}`, it is not exposed publicly. Point your VPS's Nginx at it:

```nginx
server {
    listen 443 ssl;
    server_name deposit.yourdomain.com;

    # ssl_certificate / ssl_certificate_key ...

    location / {
        proxy_pass http://127.0.0.1:8080;   # match HOST_PORT
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

To expose the container directly instead (no proxy), change the port mapping in `docker-compose.yml` from `"127.0.0.1:${HOST_PORT:-8080}:80"` to `"${HOST_PORT:-8080}:80"`.

## Project structure

This is an npm-workspaces monorepo: the reusable calculation logic lives in a
standalone `rates-calculator` package, and the web app consumes it.

```
packages/
  rates-calculator/   Reusable, framework-agnostic calculation library
    src/core/         Money rounding, date/term helpers, shared types
    src/deposits/     Deposit calculator, capitalization, validation + unit tests
src/                  Web app (deposit-calculator-web)
  components/         React UI components (form, editors, results, chart, table)
  utils/              Formatting, CSV export, theme helpers
  i18n/               i18next setup and en/ru translation resources
  types/              Shared app-level TypeScript types
public/               Static assets (favicon, PWA icons, robots.txt)
Dockerfile            Multi-stage build (Node → Nginx)
nginx.conf            SPA-aware Nginx config (history fallback, caching, gzip)
```

The app imports the library via its package name:

```ts
import { calculateDeposit } from 'rates-calculator/deposits';
import { parseISODate } from 'rates-calculator';
```

## How the engine works

Interest is accrued day by day. Each day's interest is `balance × annualRate / daysInYear`, where `daysInYear` is 365 or 366 depending on the calendar year. Accrued interest is compounded (and taxed) at each capitalization boundary, which is anchored to the deposit's start date — e.g. a deposit opened on 7 May with monthly capitalization compounds on 7 June, 7 July, and so on. Contributions and withdrawals are applied at the start of the relevant day. Money is rounded half-up to two decimals at every accrual/capitalization event.

## Testing

The calculation engine is covered by unit tests (rounding, leap years, each capitalization frequency, fixed and variable rates, contributions, withdrawals, per-contribution tax, and detail aggregation).

```bash
npm test
```

## License

This project is provided as-is for personal use.
