# AGENTS.md — Agent Guidelines for Listix Worker

Welcome to the **Listix Worker** repository. This document defines the engineering standards, architecture rules, commands, and constraints that all AI coding assistants and contributors must adhere to when working on this codebase.

---

## 1. Project Overview

- **Service**: `listix-worker`
- **Purpose**: Backend service for the Listix collaborative shopping list application.
- **Stack**:
  - **Framework**: [NestJS](https://nestjs.com/) (modular architecture, dependency injection)
  - **Database & ORM**: PostgreSQL with [Prisma ORM](https://www.prisma.io/)
  - **Realtime**: Socket.IO / NestJS WebSockets
  - **Linter**: [oxlint](https://oxc.rs/)
  - **Package Manager**: `pnpm`
  - **Testing**: Jest

---

## 2. Core Architectural Principles (Clean Architecture)

All business domain modules follow **Clean Architecture / Hexagonal Architecture** with the inward Dependency Rule:

```
presentation (controllers, DTOs, presenters)
       ↓
application (application services, commands, ports)
       ↓
     domain (entities, value objects, domain errors, domain events)
       ↑
infrastructure (prisma repositories, crypto/hash adapters, external services)
```

### Layer Constraints:
1. **Domain Layer (`domain/`)**:
   - Zero framework dependencies. Do **not** import `@nestjs/*`, `@prisma/client`, or external HTTP libraries.
   - Contains pure TypeScript entities, value objects, interfaces for repositories (outbound ports), and domain-specific errors.
2. **Application Layer (`application/`)**:
   - Encapsulates application services orchestrating business workflows (`AuthService`, `ListsService`, `ItemsService`, `MembersService`, `InvitesService`).
   - Depends only on the Domain layer and abstract ports.
3. **Infrastructure Layer (`infrastructure/`)**:
   - Implements domain repository interfaces using Prisma Client.
   - Maps between Prisma database models and domain entities.
4. **Presentation Layer (`presentation/`)**:
   - NestJS `@Controller()` classes, DTOs with `class-validator`, Presenters, and HTTP-to-domain exception mappers / filters.

---

## 3. Agent Skills

Agents working on this repository MUST actively leverage and follow the specialized skills located in `.agents/skills/`:

- **`clean-architecture`** (`.agents/skills/clean-architecture/SKILL.md`): Use when designing, organizing, or refactoring layers, use cases, domain entities, ports, and adapters. Ensure business rules remain isolated and dependencies point strictly inward.
- **`nestjs-expert`** (`.agents/skills/nestjs-expert/SKILL.md`): Use when implementing NestJS modules, controllers, providers, DTO validation, exception filters, guards, and interceptors to ensure enterprise-grade standards and clean dependency injection wiring.

When undertaking tasks related to domain modeling, layer boundaries, or NestJS infrastructure, read and adhere to the guidance in the corresponding skill.

---

## 4. Critical Rules & Guardrails

### 4.1. No Automatic Staging or Commits (Strict)
- **Do not automatically stage changes or commit**: Agents must **never** run `git add`, `git commit`, `git push`, or modify git history automatically without explicit instruction from the user.
- All code and file modifications must remain unstaged in the working directory so the user can inspect, review, and test them prior to staging or committing.

### 4.2. Platform & Store Agnostic (Strict)
- The worker backend must remain **completely platform- and store-agnostic**.
- **Do not** introduce Android-specific, iOS-specific, Google Play, or App Store URLs, configurations, or verification endpoints (e.g. no `.well-known/assetlinks.json`, no `PLAY_STORE_URL`, no `ANDROID_PACKAGE_NAME`).
- For deep-linking, use generic URI schemes (e.g. `APP_SCHEME` defaulting to `listix`, producing `${APP_SCHEME}://join/${credential}`) and web fallback copy actions.

### 4.3. TypeScript & Decorator Metadata (`isolatedModules: true`)
- TypeScript is configured with `"emitDecoratorMetadata": true` and `"isolatedModules": true`.
- **Always use `import type`** when importing types or interfaces that are used as type annotations in class constructors or methods decorated with NestJS decorators (e.g., `@Inject()`, `@Req()`, `@Res()`, `@Param()`).
- Omitting `type` will cause TS1272 errors (`TS1272: A type referenced in a decorated signature must be imported with 'import type'`).

### 4.4. Conventional Commits & Pull Requests
- When explicitly asked by the user to commit or prepare PRs, all commit messages and PR titles must strictly follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
  - `feat(<scope>): description`
  - `fix(<scope>): description`
  - `refactor(<scope>): description`
  - `test(<scope>): description`
  - `chore(<scope>): description`
- Scopes: `auth`, `lists`, `invites`, `web`, `health`, `realtime`, `config`, etc.

---

## 5. Useful Commands

| Task | Command |
| :--- | :--- |
| **Install Dependencies** | `pnpm install` |
| **Generate Prisma Client** | `pnpm run prisma:generate` |
| **Run Prisma Migrations** | `pnpm run prisma:migrate:dev` |
| **Build Project** | `pnpm run build` |
| **Run Linting** | `pnpm run lint` |
| **Run Tests** | `pnpm test` |
| **Start Development** | `pnpm run start:dev` |

---

## 6. Coding Conventions

- **File Naming**: Kebab-case with role suffix (e.g., `lists.service.ts`, `prisma-list.repository.ts`, `create-list.dto.ts`).
- **Application Services**: Group related business operations cohesively per domain aggregate (e.g., `AuthService`, `ListsService`, `ItemsService`, `MembersService`, `InvitesService`). Controllers stay lean by delegating directly to Application Services.
- **Error Handling**: Use explicit domain errors (e.g., `ListNotFoundError`, `InvalidInviteCredentialError`) and map them to HTTP responses via NestJS Exception Filters or Presenters rather than throwing generic HTTP exceptions inside domain/application layers.
- **Environment Configuration**: Validate all environment variables through `Zod` in `src/config/env.schema.ts`.
