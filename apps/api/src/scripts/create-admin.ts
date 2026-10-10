import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '@shopradar/auth';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../../../.env') });

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Set ADMIN_EMAIL to a valid admin email address.');
  }
  if (!password || password.length < 12 || password.length > 72) {
    throw new Error('Set ADMIN_PASSWORD to a unique password between 12 and 72 characters.');
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must be configured before creating an admin.');

  const prisma = new PrismaClient();
  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, passwordHash, role: 'ADMIN', active: true },
      update: { passwordHash, role: 'ADMIN', active: true },
      select: { id: true, email: true, role: true }
    });
    process.stdout.write(`Admin account ready: ${user.email}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Could not create admin account.'}\n`);
  process.exitCode = 1;
});
