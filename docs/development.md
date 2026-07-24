# Development

Use Node.js 22 and XAMPP MySQL/MariaDB. Start MySQL on port `3306`, then run `START-NIVASAFE.cmd` from the repository root.

The local database URL is:

```text
mysql://root:@127.0.0.1:3306/nivasafe
```

The startup script creates the database, runs `prisma db push`, loads the development seed and starts both applications.

Development ports:

- Web: `5043`
- API: `5044`

Vite reads `VITE_API_URL` from the repository root `.env`.

API changes must enforce organization scope before reading an entity. Business calculations belong in `packages/domain` and require tests. Do not log passwords, tokens or provider keys.

Add a new assessment by defining its pure validation/calculation in the domain package, adding tenant-indexed Prisma entities, exposing a scoped API route, then connecting a translated UI workflow and tests.
