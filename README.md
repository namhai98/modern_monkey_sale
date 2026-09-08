# Modern Monkey Sale 🐒

An e-commerce storefront: Node.js/Express + PostgreSQL backend, React (Vite + Tailwind) frontend.

## Structure

```
server/   Express REST API
client/   React frontend (Vite)
```

## Getting started

### 1. Database

Create a PostgreSQL database, then load the schema:

```bash
createdb modern_monkey_sale
psql -U postgres -d modern_monkey_sale -f server/src/config/schema.sql
```

This also seeds 3 sample products.

**Upgrading an existing database:**

```bash
psql -U postgres -d modern_monkey_sale -f server/src/config/migrations/001_auth_roles.sql
psql -U postgres -d modern_monkey_sale -f server/src/config/migrations/002_tokens.sql
psql -U postgres -d modern_monkey_sale -f server/src/config/migrations/003_products_inventory.sql
psql -U postgres -d modern_monkey_sale -f server/src/config/migrations/004_order_management.sql
psql -U postgres -d modern_monkey_sale -f server/src/config/migrations/005_product_images.sql
psql -U postgres -d modern_monkey_sale -f server/src/config/migrations/006_product_image_storage.sql
```

**Object storage for product images** — set in `server/.env` (see `.env.example`):
`STORAGE_PROVIDER=local` (dev; writes optimised WebP to `server/var/`, served at `/media`, git-ignored)
or `STORAGE_PROVIDER=s3` with `STORAGE_BUCKET` / `STORAGE_ENDPOINT` / `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY`
for any S3-compatible provider (AWS S3, Cloudflare R2, MinIO). Credentials are never hard-coded.

Uploaded product images are written to `server/uploads/` and served at `/uploads/*` (git-ignored; move to object storage for production).

Create the first admin account (interactive prompt):

```bash
cd server && npm run create-admin
```

Load a fuller demo catalogue (3 categories × 20 products; clears existing shop data):

```bash
cd server && npm run seed:catalog
```

### 2. Backend

```bash
cd server
cp .env.example .env   # edit with your DB credentials and a real JWT_SECRET
npm install
npm run dev             # http://localhost:5000
```

Health check: `GET http://localhost:5000/api/health`

### 3. Frontend

```bash
cd client
npm install
npm run dev              # http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to `http://localhost:5000`.

## API overview

| Method | Endpoint             | Auth            | Description              |
|--------|-----------------------|-----------------|---------------------------|
| GET    | /api/products         | - / staff       | List — `{ items, total, page, limit }`. Params: `search`, `category` (slug or id), `sort` (name·price·stock·created_at), `order`, `page`, `limit`, and for staff `include_inactive=1`, `low_stock=1` |
| GET    | /api/products/:id     | - / staff       | One product (404 for anon if inactive) |
| POST   | /api/products         | manager+        | Create product (fields only; images via the sub-resource below) — sets initial stock + a `restock` movement |
| PATCH  | /api/products/:id     | manager+        | Partial update of product fields; `is_active:false` is the soft delete |
| POST   | /api/products/:id/images | manager+     | Multipart `image` (JPG/PNG ≤10MB) → validate, optimise, store 3 WebP variants; 409 `IMAGE_LIMIT` past 5 |
| PATCH  | /api/products/:id/images/reorder | manager+ | Body `{ order: [imageId, …] }` — must list every image id once |
| PATCH  | /api/products/:id/images/:imageId/primary | manager+ | Move that image to first (primary) |
| DELETE | /api/products/:id/images/:imageId | manager+ | Delete DB row **and** all storage variants |
| PATCH  | /api/products/:id/stock | manager+      | Adjust stock — `{ delta }` or `{ set }` + `type`, `reason` |
| GET    | /api/products/:id/movements | manager+  | Stock movement history |
| POST   | /api/products/upload  | manager+        | Multipart `image` → `{ url }` |
| GET    | /api/categories       | -               | List categories with product counts |
| POST   | /api/categories       | manager+        | Create category (slug auto-derived) |
| PATCH  | /api/categories/:id   | manager+        | Rename category |
| DELETE | /api/categories/:id   | manager+        | Delete (409 if used by products) |
| POST   | /api/auth/register    | -               | Create a **customer** account |
| POST   | /api/auth/login       | -               | Log in (sets refresh cookie) |
| POST   | /api/auth/refresh     | refresh cookie  | Rotate refresh token, get a new access token |
| POST   | /api/auth/logout      | refresh cookie  | Revoke the current session |
| POST   | /api/auth/logout-all  | user            | Revoke every session for this user |
| POST   | /api/auth/forgot-password | -           | Email a reset link (always 200) |
| POST   | /api/auth/reset-password  | -           | Set a new password from a reset token |
| GET    | /api/auth/me          | user            | Current user (validates token) |
| PUT    | /api/users/me         | user            | Update own name            |
| PUT    | /api/users/me/password| user            | Change own password        |
| GET    | /api/users            | manager+        | List users                 |
| POST   | /api/users            | admin           | Create staff/manager/admin |
| PATCH  | /api/users/:id/role   | admin           | Change a user's role       |
| PATCH  | /api/users/:id/status | admin           | Enable / disable a user    |
| POST   | /api/orders           | user            | Place an order (atomic stock decrement, seeds status history) |
| GET    | /api/orders/mine      | user            | List my orders              |
| GET    | /api/orders           | staff+          | List all — `{ items, total, page, limit }`; params `status`, `user_id`, `from`, `to`, `search` |
| GET    | /api/orders/:id       | owner / staff+  | Order detail: items, status history, `allowed_transitions` (staff) |
| PATCH  | /api/orders/:id/status | staff+ (refund: manager+) | Change status per the state machine; `{ status, note?, restock? }` |
| POST   | /api/orders/:id/cancel | owner          | Self-cancel while `pending` (restocks) |

**Roles:** `customer` (default, storefront only) · `staff` · `manager` (catalog + user list) · `admin` (full). JWT carries `role`; error responses include a `code` (`NO_TOKEN`, `TOKEN_EXPIRED`, `INVALID_TOKEN`, `TOKEN_REUSED`, `FORBIDDEN`, `INVALID_CREDENTIALS`, `EMAIL_TAKEN`, `VALIDATION_ERROR`, `ACCOUNT_DISABLED`, `RATE_LIMITED`).

**Sessions:** short-lived access token (`JWT_EXPIRES_IN`, default `15m`) kept in `localStorage`, plus a rotating refresh token in an `httpOnly` cookie (`REFRESH_TOKEN_TTL_DAYS`, default `30`). The client auto-calls `/api/auth/refresh` on a `401` and replays the request. Refresh tokens rotate on every use; presenting an already-rotated token revokes the whole token family (`TOKEN_REUSED`). Password reset and "log out of all devices" revoke every refresh token for the user. Reset links are emailed via SMTP (`SMTP_*` in `.env`); if SMTP is not configured the link is written to the server console.

**Product images:** up to 5 per product. On upload the backend validates the bytes (`sharp`), auto-orients from EXIF, strips metadata, resizes preserving aspect ratio **without upscaling**, and writes three optimised WebP variants to object storage — `thumbnail` (≤300px), `card` (≤800px), `detail` (≤1600px) — under a backend-generated immutable key `products/{id}/{uuid}/{variant}.webp`. Only metadata (`storage_key`, `sort_order`, `width`, `height`, `mime_type`, `file_size`) lands in `product_images`; no binaries in Postgres, no originals kept. Variant URLs carry `Cache-Control: public, max-age=31536000, immutable` — replacing an image mints a new key, so caches never go stale. Deleting an image (or reordering / setting primary) is handled by the sub-resource API and removes every storage variant. `GET /products*` returns `images: [{ id, sort_order, width, height, thumbnail, card, detail }]` plus `image_url` (the primary's `card` url, synced automatically). Legacy/external image rows (`url`, e.g. the demo stock photos) still serialise into the same three-variant shape. The storefront picks `card` for grids and `detail` for the PDP slider with lazy loading; the admin product form (edit mode) uploads, reorders, sets primary and deletes.

**Inventory:** every stock change is a row in `stock_movements` (`sale` on order fulfilment, `restock`/`adjustment`/`return` from the admin), so the ledger always explains the current level. Order fulfilment decrements with a guarded `UPDATE ... WHERE stock >= qty` inside the order transaction — concurrent orders can't oversell (`INSUFFICIENT_STOCK`). Stock only ever moves through order fulfilment, `PATCH /products/:id/stock`, or an order cancel/refund.

**Order lifecycle:** `pending → paid → shipped → delivered`, with `cancelled` reachable from pending/paid and `refunded` from paid/shipped/delivered. Transitions are enforced by a state machine (`INVALID_TRANSITION` otherwise); `refunded` requires manager+. Entering `cancelled`/`refunded` returns items to stock (`return` movements) unless `restock:false`. Every change is appended to `order_status_history` with actor + note. Staff area lives at `/admin/orders`; staff can reach it, `manager+` also see products/categories/users.

## What's built (MVP so far)

- Storefront catalog: search, category filter, sort, pagination; product detail with stock status
- Cart (persisted in localStorage)
- Checkout flow → creates a "pending" order (no real payment gateway yet), atomic stock decrement
- Auth with role-based access (`customer`/`staff`/`manager`/`admin`): short access token + rotating refresh cookie, silent refresh, reuse detection
- Password reset by email (`/forgot-password`, `/reset-password`)
- Profile page: edit name, change password, "log out of all devices"
- Admin UI: orders (`/admin/orders`, staff+ — list with filters, detail, status workflow), and manager+ products (CRUD, optimised image upload / reorder / primary / delete, stock adjust, activate/deactivate), categories, users
- Inventory: `stock_movements` ledger, low-stock threshold + filter, guarded decrement on order
- Order management: state-machine status workflow, cancel/refund with restock, `order_status_history` audit trail
- Customer order pages: list + detail with line items, history, self-cancel while pending
- Protected routes (client + server) with auto-refresh, 401 fallback to login, and a 403 page

## Next steps

- Wire up Stripe for real payments (drive `pending → paid` from a webhook)
- Storefront + admin UI polish
- Move product images to object storage (S3/Cloudinary)
- Deploy: backend to Render/Fly.io, frontend to Vercel/Netlify, DB on Supabase/Railway
