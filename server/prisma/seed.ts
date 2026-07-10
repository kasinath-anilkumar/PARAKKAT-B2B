import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateStrongPassword(): string {
  return crypto.randomBytes(18).toString('base64url');
}

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL || 'admin@parakkatjewels.com';
  let password = process.env.ADMIN_SEED_PASSWORD || 'admin123';
  let generated = false;

  if (!password) {
    password = generateStrongPassword();
    generated = true;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      mfaEnabled: false,
      mfaMethod: 'NONE',
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: 'User',
      entityId: user.id,
      event: 'SEED_ADMIN_CREATED',
      actorRole: 'SYSTEM',
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Admin user ready: ${email} (ADMIN — requires MFA setup on first login)`);
  if (generated) {
    // eslint-disable-next-line no-console
    console.log(`Generated password (shown once, not stored anywhere else): ${password}`);
    // eslint-disable-next-line no-console
    console.log('Rotate this password after first login. ADMIN role requires MFA setup on first login.');
  }

  // --- Demo login data (dev only) -----------------------------------------
  // AGENCY/AGENT roles don't force MFA, so these let you log in instantly for
  // testing without an authenticator app. Skipped in production.
  if (process.env.NODE_ENV !== 'production' && process.env.SEED_DEMO !== 'false') {
    const demoPassword = 'demo1234';
    const demoHash = await bcrypt.hash(demoPassword, 12);

    const agency = await prisma.agency.upsert({
      where: { id: '00000000-0000-0000-0000-0000000000a1' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-0000000000a1',
        legalName: 'Demo Travels Pvt Ltd',
        gstin: '27AABCU9603R1ZM',
        pan: 'AABCU9603R',
        status: 'ACTIVE',
        contactEmail: 'agency@demo.local',
        contactPhone: '9876543210',
        activatedAt: new Date(),
      },
    });

    await prisma.user.upsert({
      where: { email: 'agency@demo.local' },
      update: {},
      create: { email: 'agency@demo.local', passwordHash: demoHash, role: 'AGENCY', agencyId: agency.id },
    });
    await prisma.user.upsert({
      where: { email: 'agent@demo.local' },
      update: {},
      create: { email: 'agent@demo.local', passwordHash: demoHash, role: 'AGENT', agencyId: agency.id },
    });

    // Commercial terms so the demo agency can actually book (credit tier).
    const hasConfig = await prisma.commercialConfiguration.findFirst({
      where: { agencyId: agency.id, isCurrent: true },
    });
    if (!hasConfig) {
      await prisma.commercialConfiguration.create({
        data: {
          agencyId: agency.id,
          tier: 'GOLD',
          paymentMode: 'CREDIT',
          creditLimit: 500000,
          paymentTerms: 'net 30',
          markupPct: 10,
          effectiveFrom: new Date(),
          updatedById: user.id,
          isCurrent: true,
        },
      });
    }

    // eslint-disable-next-line no-console
    console.log('Demo users ready (no MFA): agency@demo.local / agent@demo.local  — password: demo1234');
  }
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
