# NIVASafe local development with XAMPP

Local development no longer depends on Docker.

- Frontend: Vite/React on `http://localhost:5043`
- Backend: Node.js/Fastify on `http://localhost:5044`
- Database: XAMPP MySQL/MariaDB on `127.0.0.1:3306`, database `nivasafe`
- Files: local folder `apps/api/uploads`
- Redis: disabled locally; AI requests fall back to inline execution
- MinIO/S3: disabled locally

## Start

1. Open XAMPP Control Panel.
2. Start **MySQL**. Apache is not required for this Node.js project.
3. Run `START-NIVASAFE.cmd` from the project root.
4. Open `http://localhost:5043`.

The startup script creates the `nivasafe` database, applies the Prisma schema with `prisma db push`, and seeds demo users.

Demo account:

- Email: `admin@nivasafe.local`
- Password: `Demo123!`

The default XAMPP configuration is assumed: MySQL user `root` with an empty password. Do not use these development credentials in production.
