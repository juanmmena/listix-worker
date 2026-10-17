# Listix Worker

Backend service for the **Listix** collaborative, offline-first shopping list application. Built with **NestJS**, **PostgreSQL (Prisma ORM)**, and **WebSockets (Socket.IO)** following **Clean Architecture** principles.

---

## Architecture & System Overview

Listix is designed offline-first: clients maintain local SQLite/embedded state and interact with the backend service when sharing or synchronizing lists with collaborators.

```
presentation (controllers, DTOs, Socket.IO gateways, error filters)
       ↓
application (services, transaction orchestrators, event publishers)
       ↓
     domain (entities, value objects, membership policies, domain errors)
       ↑
infrastructure (prisma repositories, crypto/hash adapters, system clocks)
```

### Core Capabilities:

1. **Anonymous Identity Management**: Secure device authentication using JWT access tokens (15-min TTL) and cryptographically hashed, rotatable refresh tokens (90-day TTL).
2. **Deterministic State Synchronization**: Last-Write-Wins (LWW) conflict resolution for shopping lists and items based on monotonic client timestamps (`updatedAt`). Supports soft deletion and item resurrection.
3. **Collaboration & Sharing Lifecycle**:
   - Short, human-friendly Crockford Base32 invite codes (`inviteCode`, 6 chars) and long URL tokens (`token`).
   - Strict 5-member limit per list (`MAX_LIST_MEMBERS = 5`).
   - Transactional PostgreSQL advisory locks (`pg_advisory_xact_lock`) ensuring serialized, race-free member joining.
4. **Realtime Broadcasts**: Live WebSocket room updates (`list.changed`) over `/realtime` via Socket.IO, with automatic client eviction when access is revoked.
5. **Platform-Agnostic Web Fallback**: Public web landing route (`/join/:credential`) offering universal deep-linking (`${APP_SCHEME}://join/${credential}`) and one-click code copying.

---

## Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/) (v24 LTS)
- **Framework**: [NestJS](https://nestjs.com/) (v12)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (v17)
- **ORM**: [Prisma](https://www.prisma.io/) (v7)
- **Realtime**: [Socket.IO](https://socket.io/)
- **Linter**: [oxlint](https://oxc.rs/) & [Prettier](https://prettier.io/)
- **Package Manager**: [pnpm](https://pnpm.io/) (v12)
- **Testing**: [Jest](https://jestjs.io/) & [Testcontainers](https://node.testcontainers.org/)
- **Containerization**: [Docker](https://www.docker.com/) (multi-stage Alpine builds)

---

## Getting Started

### Prerequisites

- **Node.js** >= 24.0.0
- **pnpm** >= 12.0.0
- **Docker** & **Docker Compose**

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/listix-app/listix-worker.git
cd listix-worker
pnpm install
```

### 2. Environment Configuration

Copy the example environment file and adjust if necessary:

```bash
cp .env.example .env
```

| Variable                 | Description                                            | Default                                                              |
| :----------------------- | :----------------------------------------------------- | :------------------------------------------------------------------- |
| `NODE_ENV`               | Environment mode (`development`, `production`, `test`) | `development`                                                        |
| `PORT`                   | HTTP server listening port                             | `3000`                                                               |
| `DATABASE_URL`           | PostgreSQL connection string                           | `postgresql://postgres:postgres@localhost:5432/listix?schema=public` |
| `JWT_ACCESS_SECRET`      | Secret key for signing access tokens (>= 32 chars)     | —                                                                    |
| `JWT_ACCESS_TTL_SECONDS` | Access token lifespan in seconds                       | `900` (15 min)                                                       |
| `REFRESH_TOKEN_TTL_DAYS` | Refresh token lifespan in days                         | `90`                                                                 |
| `PUBLIC_BASE_URL`        | Public API base URL used for shareable invite links    | `http://localhost:3000`                                              |
| `APP_SCHEME`             | Custom URI deep-link scheme                            | `listix`                                                             |
| `THROTTLE_TTL_MS`        | Rate limiting sliding window in ms                     | `60000` (1 min)                                                      |
| `THROTTLE_LIMIT`         | Max requests per IP in rate window                     | `30`                                                                 |

### 3. Start Database & Run Migrations

Start the local PostgreSQL container:

```bash
docker compose up -d postgres
```

Generate the Prisma Client and run migrations:

```bash
pnpm run db:migrate
```

### 4. Run the Application

```bash
# Start in watch mode for development
pnpm run start:dev

# Start in production mode
pnpm run start:prod
```

---

## API & Gateway Surface

### REST Endpoints (`/api/v1`)

- `POST /api/v1/auth/anonymous`: Create a new anonymous user session.
- `POST /api/v1/auth/refresh`: Rotate refresh token and issue new session tokens.
- `GET /api/v1/auth/me`: Retrieve current authenticated user profile.
- `GET /api/v1/lists`: List all shopping lists the user belongs to.
- `PUT /api/v1/lists/:listId`: Create or sync a shopping list (Last-Write-Wins).
- `GET /api/v1/lists/:listId`: Retrieve complete list snapshot (list details, active items, members).
- `DELETE /api/v1/lists/:listId`: Soft-delete a list (managers/owners only).
- `PUT /api/v1/lists/:listId/items/:itemId`: Upsert an item (Last-Write-Wins, resurrection).
- `DELETE /api/v1/lists/:listId/items/:itemId`: Soft-delete an item.
- `POST /api/v1/lists/:listId/invites`: Create or rotate active invite for list.
- `DELETE /api/v1/lists/:listId/invites/active`: Revoke active invite link and code.
- `GET /api/v1/invites/:credential`: Validate invite code or token (rate-limited).
- `POST /api/v1/invites/join`: Join a list using an invite credential.
- `PATCH /api/v1/lists/:listId/members/:userId`: Promote or demote member role.
- `DELETE /api/v1/lists/:listId/members/:userId`: Remove collaborator from list.

### Public & Health Routes

- `GET /join/:credential`: Universal HTML landing page with deep-link redirection and code fallback.
- `GET /health`: NestJS Terminus database liveness & health check.

### Realtime Gateway (`/realtime`)

- **Connection**: Requires `auth: { token: "<jwt_access_token>" }` in Socket.IO handshake.
- **Client Events**:
  - `list:subscribe` (`{ listId: string }`): Join list notification room.
  - `list:unsubscribe` (`{ listId: string }`): Leave list notification room.
- **Server Events**:
  - `list.changed`: Broadcasted when lists, items, or members are modified.
  - `session.error`: Emitted when connection token validation fails.

---

## Testing

The project includes an extensive test suite verifying pure domain logic, membership invariants, rate limiting, and real PostgreSQL concurrent joins:

```bash
# Run unit tests
pnpm run test

# Run end-to-end integration tests (real database)
pnpm run test:e2e

# Run test coverage
pnpm run test:cov
```

---

## Docker & Production Deployment

### Multi-Stage Dockerfile Targets

- **`migrate`**: Release job container running database migrations before traffic switch.
- **`runtime`**: Minimal production image running under non-root `node` user on Alpine.

```bash
# Build migrate target
docker build --target migrate -t listix-worker:migrate .

# Build runtime target
docker build --target runtime -t listix-worker:latest .
```

### Full Stack with Docker Compose

Run the entire stack (PostgreSQL + Migrations + API worker):

```bash
docker compose up --build
```

---

## Code Quality & Standards

- **Linting**: Fast linting with `oxlint src/ test/` via `pnpm run lint`.
- **Pre-commit**: Husky git hooks with `lint-staged` running `oxlint --fix` and `prettier --write`.
- **Commits**: Conventional Commits standard enforced via `commitlint`.

---

## License

This project is proprietary and confidential. All rights reserved.
