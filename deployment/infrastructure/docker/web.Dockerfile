FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
COPY shared/domain/package.json shared/domain/package.json
RUN pnpm install --frozen-lockfile
COPY frontend frontend
COPY shared/domain shared/domain
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @nivasafe/domain build && pnpm --filter @nivasafe/web build

FROM nginx:1.27-alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY deployment/infrastructure/nginx/web.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
