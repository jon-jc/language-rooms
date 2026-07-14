#!/usr/bin/env node
/**
 * Grant a platform role from the command line (there is deliberately no
 * self-serve path to ADMIN in the app):
 *
 *   node scripts/promote-user.mjs someone@example.com ADMIN
 *   node scripts/promote-user.mjs someone@example.com MODERATOR
 *   node scripts/promote-user.mjs someone@example.com USER      # demote
 *
 * The change is written to the audit log.
 */
import { PrismaClient } from "@prisma/client";

const [email, role = "ADMIN"] = process.argv.slice(2);
const VALID = ["USER", "MODERATOR", "ADMIN"];

if (!email || !VALID.includes(role)) {
  console.error("Usage: node scripts/promote-user.mjs <email> [USER|MODERATOR|ADMIN]");
  process.exit(1);
}

const db = new PrismaClient();
try {
  const user = await db.user.update({
    where: { email: email.toLowerCase() },
    data: { role },
  });
  await db.auditLog.create({
    data: {
      actorId: null,
      action: "user.role_changed_cli",
      targetUserId: user.id,
      detail: { role },
    },
  });
  console.log(`${user.email} is now ${role}`);
} catch (err) {
  console.error(err.code === "P2025" ? `No user with email ${email}` : err.message);
  process.exit(1);
} finally {
  await db.$disconnect();
}
