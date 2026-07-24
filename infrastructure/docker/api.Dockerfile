FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/domain/package.json packages/domain/package.json
RUN pnpm install --frozen-lockfile
COPY apps/api apps/api
COPY packages/domain packages/domain
RUN pnpm --filter @nivasafe/domain build && pnpm --filter @nivasafe/api prisma:generate && pnpm --filter @nivasafe/api build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/packages/domain/dist ./packages/domain/dist
COPY --from=build /app/packages/domain/package.json ./packages/domain/package.json
WORKDIR /app/apps/api
EXPOSE 5044
CMD ["node","dist/server.js"]
