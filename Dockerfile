# -------------------------------------------------------------------
# Stage 1: Dependencies
# -------------------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm@12.6.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# -------------------------------------------------------------------
# Stage 2: Build
# -------------------------------------------------------------------
FROM deps AS build
WORKDIR /app

COPY . .
RUN pnpm run build

# -------------------------------------------------------------------
# Stage 3: Release Migration Job
# -------------------------------------------------------------------
FROM build AS migrate
WORKDIR /app

CMD ["pnpm", "run", "db:deploy"]

# -------------------------------------------------------------------
# Stage 4: Minimal Production Runtime
# -------------------------------------------------------------------
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN npm install -g pnpm@12.6.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts && pnpm store prune

COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/prisma ./prisma
COPY --chown=node:node --from=build /app/prisma.config.ts ./

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
