@echo off
setlocal
cd /d "%~dp0"
if not exist .env (
  echo Create .env from .env.production.example first.
  exit /b 1
)
call pnpm install --frozen-lockfile || exit /b 1
call pnpm --filter @nivasafe/domain build || exit /b 1
call pnpm db:generate || exit /b 1
call pnpm db:deploy || exit /b 1
call pnpm build || exit /b 1
echo Build and MySQL migration completed. Provision once with: pnpm db:provision
