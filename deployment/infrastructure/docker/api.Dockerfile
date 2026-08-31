FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY shared/domain/package.json shared/domain/package.json
RUN pnpm install --frozen-lockfile
COPY backend backend
COPY shared/domain shared/domain
RUN pnpm --filter @nivasafe/domain build && pnpm --filter @nivasafe/api prisma:generate && pnpm --filter @nivasafe/api build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/shared/domain/dist ./shared/domain/dist
COPY --from=build /app/shared/domain/package.json ./shared/domain/package.json
WORKDIR /app/backend
EXPOSE 5044
CMD ["node","dist/server.js"]
