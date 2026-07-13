import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiHandler, parseBody, requireSession } from "@/lib/api";
import { logger } from "@/lib/logger";

const log = logger("auth");

const consentSchema = z.object({
  // Explicit, not implicit: the client must send the literal acknowledgement.
  acceptVideoConductRules: z.literal(true, {
    error: "You must accept the video conduct rules",
  }),
});

/**
 * Records the user's explicit consent to the video conduct rules.
 * Joining any room is blocked until this timestamp exists.
 */
export const POST = apiHandler(async (req: NextRequest) => {
  const session = await requireSession();
  await parseBody(req, consentSchema);

  const user = await db.user.update({
    where: { id: session.sub },
    data: { conductConsentAt: new Date() },
  });

  log.info({ userId: user.id }, "video conduct rules consent recorded");
  return NextResponse.json({ conductConsentAt: user.conductConsentAt });
});
