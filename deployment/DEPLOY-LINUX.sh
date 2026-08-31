#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v node >/dev/null
command -v pnpm >/dev/null
[ -f .env ] || { echo "Create .env from .env.production.example first"; exit 1; }
pnpm install --frozen-lockfile
pnpm --filter @nivasafe/domain build
pnpm db:generate
pnpm db:deploy
pnpm build
printf '\nBuild and MySQL migration completed. Provision once with: pnpm db:provision\n'
