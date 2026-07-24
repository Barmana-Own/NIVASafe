# Security

Implemented controls include bcrypt cost 12, short access tokens, hashed rotating refresh sessions, rate limits, Helmet headers, restricted CORS, Zod validation, Prisma parameterization, upload allow-list/size limit, tenant membership enforcement, role checks for audit data, request IDs, secret redaction and structured errors.

Before production: use 32+ byte random secrets, HTTPS, narrow `APP_URL`, managed secret injection, malware scanning for uploads, object-storage signed URLs, SMTP credentials and an external dependency/image scan. The local filesystem upload adapter is for local development only.
