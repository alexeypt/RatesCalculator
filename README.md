# Rates Calculator

A fast, privacy-friendly **deposit and bond calculator** built as an installable Progressive Web App (PWA). Switch between a **Deposits** mode (day-by-day growth, period details, effective annual rate, growth chart) and a **Bonds** mode (yields, duration, cash-flow schedule and chart). All calculations run entirely in your browser — no data ever leaves your device.

## Deposit features

- **Compound interest** with a day-by-day simulation using the actual/actual day-count convention (365/366, leap-year aware).
- **Flexible capitalization** frequencies: daily, weekly, twice a month, three times a month, monthly, quarterly, semi-annual, annual — all anchored to the deposit's start date.
- **Fixed or variable rates** — define rate periods by date ranges with full coverage validation.
- **Top-ups (contributions)** — recurring (monthly/quarterly/annual) or one-time on specific dates, with optional per-contribution tax.
- **Withdrawals** — recurring or one-time, clamped to the available balance.
- **Income tax** handling, applied per capitalization event (with sensible defaults for long-term deposits).
- **Detail views** — "balance changes only" (default), day, month, quarter, or year, plus CSV export.
- **Summary metrics** — final balance, net income, total tax, effective annual rate, total rate, and total annual rate.

## Bond features

- **Regular and currency-indexed bonds** — indexed bonds use the currency-equivalent method (coupons and nominal convert at the base index, the price at the current index; yields are computed in the index currency).
- **Coupon schedule** — generate dates from a first-coupon date + frequency, or import a JSON array of dates; coupon amounts are derived automatically from the rate, nominal and a start-anchored actual/actual day count.
- **Yield metrics** — simple yield to maturity, effective yield (IRR), current yield, and Macaulay duration, plus an estimated cash flow to maturity.
- **Cash-flow schedule and chart**, with a nominal / index-equivalent breakdown for indexed bonds, plus CSV export.
- **Saved bonds** — store named bond configurations in the browser (localStorage) and export/import them as JSON.

## Shared

- **Internationalization** — English and Russian, with locale-aware number and date formatting.
- **Light / dark theme** with persistence.
- **Installable PWA** — works offline and can be added to a phone's home screen.

## Tech stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite 6](https://vite.dev/) build tooling and [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [Recharts](https://recharts.org/) for the growth and cash-flow charts
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
    src/bonds/        Bond calculator (yields, duration, cash flows), coupon helpers + unit tests
src/                  Web app (rates-calculator-web)
  features/           Deposit and bond calculator containers (one per mode)
  components/         React UI components (forms, editors, results, charts, tables)
  utils/              Formatting, CSV export, bond storage, theme helpers
  i18n/               i18next setup and en/ru translation resources
public/               Static assets (favicon, PWA icons, robots.txt)
Dockerfile            Multi-stage build (Node → Nginx)
nginx.conf            SPA-aware Nginx config (history fallback, caching, gzip)
```

The app imports the library via its package name:

```ts
import { calculateDeposit } from 'rates-calculator/deposits';
import { calculateBond } from 'rates-calculator/bonds';
import { parseISODate } from 'rates-calculator';
```

## How the engine works

**Deposits.** Interest is accrued day by day. Each day's interest is `balance × annualRate / daysInYear`, where `daysInYear` is 365 or 366 depending on the calendar year. Accrued interest is compounded (and taxed) at each capitalization boundary, which is anchored to the deposit's start date — e.g. a deposit opened on 7 May with monthly capitalization compounds on 7 June, 7 July, and so on. Contributions and withdrawals are applied at the start of the relevant day. Money is rounded half-up to two decimals at every accrual/capitalization event.

**Bonds.** Each coupon amount is `nominal × rate × yearFraction(periodStart, paymentDate)` using the actual/actual day count, with the first period anchored to the bond start date so stub periods are exact. Simple yield to maturity follows the standard `((N + ΣC − P) / P) / years` formula; effective yield is the IRR of the dated cash flows (matching Excel's `ЧИСТВНДОХ` / XIRR); Macaulay duration is the present-value-weighted time to each flow. For currency-indexed bonds, coupons and nominal are converted at the base index and the price at the current index, and all yields are computed in the index currency.

## Testing

The calculation engine is covered by unit tests — deposits (rounding, leap years, each capitalization frequency, fixed and variable rates, contributions, withdrawals, per-contribution tax, and detail aggregation) and bonds (day-count helpers, coupon generation, simple and effective yield against worked examples, the indexed currency-equivalent method, and validation).

```bash
npm test
```

## License

This project is provided as-is for personal use.
