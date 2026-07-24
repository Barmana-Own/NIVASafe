import "fastify";
declare module "fastify" {
  interface FastifyRequest { actor?: { userId: string; organizationId?: string; role?: string } }
}
