import { hashPassword } from '@shopradar/auth';

async function main() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 8 || password.length > 72) {
    throw new Error('Set ADMIN_PASSWORD to the admin password (8–72 characters) before hashing it.');
  }

  process.stdout.write(`${await hashPassword(password)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Could not hash the admin password.'}\n`);
  process.exitCode = 1;
});
