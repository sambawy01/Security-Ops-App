# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# ---- deps ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# ---- build ----
FROM deps AS build
COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate
RUN npx tsc

# ---- runtime ----
# tsx is installed alongside prod deps because Prisma 7's generated ESM client
# omits .js extensions on internal imports — node's strict resolver rejects them,
# but tsx resolves them transparently. prisma CLI is installed for migrate deploy.
FROM base AS runtime
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
 && npm install --no-save tsx@4 prisma@7 \
 && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/prisma ./prisma
COPY prisma.config.ts ./

EXPOSE 3000
CMD ["sh", "-c", "set -e; prisma migrate deploy; exec tsx dist/index.js"]
