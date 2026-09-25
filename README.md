# AssetDesk

[![CI](https://github.com/JimmyAlter/AssetDesk/actions/workflows/ci.yml/badge.svg)](https://github.com/JimmyAlter/AssetDesk/actions/workflows/ci.yml)

A small IT service desk and asset inventory: ticket intake, an asset list with health states, a people directory and a summary dashboard, over a JWT-authenticated Express API.

**Live demo:** [assetdesk-demo.vercel.app](https://assetdesk-demo.vercel.app). Sign in with `demo@assetdesk.dev` / `demo123`. The API runs on Render's free tier, so the first request after a while idle can take up to a minute.

| Overview | Workforce |
|---|---|
| ![Overview](docs/screenshots/overview.png) | ![Workforce](docs/screenshots/workforce.png) |

## Scope

This is a deliberately small build that shares its foundation with [CommerceSuite](https://github.com/JimmyAlter/CommerceSuite).

**What it does**

- Email and password login (bcrypt hashes, 8-hour JWT, rate-limited login)
- Create tickets with a title, priority (low, medium or high) and description. The requester is taken from the token, and the input is validated on the server
- List tickets, assets and people, with search, filters and pagination in the UI
- Dashboard counts: assets, open tickets, tickets resolved in the last 7 days, and open high-priority tickets

**What it does not do (yet)**

- Role-based authorization. Users have a role, but the API does not check it; every authenticated user can read everything
- Ticket assignment and status transitions. New tickets are always `open` and `Unassigned`, and there are no update endpoints
- Status history or audit trail

## Stack

React 19 and Vite (frontend) · Node.js, Express and better-sqlite3 (API) · JWT auth · helmet and express-rate-limit

```text
React (Vercel) ──► Express API (Render) ──► SQLite
```

The frontend also has a browser-only mock API (`frontend/src/mockApi.js`). It is used when `VITE_API_URL` is not set and the app runs on `*.vercel.app` or with `VITE_DEMO_MODE=true`. A badge in the top bar shows which mode is active.

## Running it locally

```bash
cd backend
cp .env.example .env
npm ci
npm start            # http://localhost:4000, creates and seeds the database on first run

cd ../frontend
npm ci
npm run dev          # http://localhost:5173
```

## Tests

```bash
cd backend && npm test
```

The node:test suite starts the API against a fresh SQLite file and checks the following:

- every data route requires a valid token
- login errors don't reveal whether the email exists
- password hashes never appear in a response
- the requester is taken from the token
- ticket input is validated on the server
- SQL-looking input is stored as plain text

CI runs these tests on Node 20 and 22, plus the frontend lint and build.

## Security notes

- All queries are prepared statements with `?` placeholders; no SQL is built from strings.
- `helmet` sets the default security headers. JSON bodies are capped at 200 KB, and login is limited to 20 attempts per minute.
- With `NODE_ENV=production`, the server exits at startup if `JWT_SECRET` is missing or still the development default.
- CORS allows `CORS_ORIGIN` and localhost origins.

## Deployment

`render.yaml` defines the API service and `DB_PATH`. The frontend is a static Vite build on Vercel with `VITE_API_URL` pointing at the API. SQLite fits a single small instance like this demo. For anything with real traffic or more than one instance, move to PostgreSQL. The data layer lives in `backend/src/db.js`.

## License

MIT. See [LICENSE](LICENSE).
