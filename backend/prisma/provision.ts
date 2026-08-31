import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const email = required("SEED_ADMIN_EMAIL").toLowerCase();
  const password = required("SEED_ADMIN_PASSWORD");
  if (password.length < 8) throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters");
  const displayName = process.env.SEED_ADMIN_NAME?.trim() || "NIVASafe Administrator";
  const organizationNameFa = process.env.SEED_ORG_NAME_FA?.trim() || "سازمان اصلی";
  const organizationNameEn = process.env.SEED_ORG_NAME_EN?.trim() || "Main Organization";
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { displayName, passwordHash, active: true },
    create: { email, displayName, passwordHash, active: true, locale: "fa" },
  });

  const existingMembership = await prisma.organizationMember.findFirst({ where: { userId: user.id, role: "ORG_ADMIN", active: true }, include: { organization: true } });
  const organization = existingMembership?.organization ?? await prisma.organization.create({ data: { nameFa: organizationNameFa, nameEn: organizationNameEn } });
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
    update: { role: "ORG_ADMIN", active: true },
    create: { organizationId: organization.id, userId: user.id, role: "ORG_ADMIN", active: true },
  });
  process.stdout.write(`Provisioned administrator ${email} for organization ${organization.id}\n`);
}

main().finally(() => prisma.$disconnect());
