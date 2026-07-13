import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiHandler, parseBody, requireSession } from "@/lib/api";
import { CEFR_LEVELS, LANGUAGE_CODES } from "@/lib/languages";

const profileSchema = z
  .object({
    nativeLanguages: z
      .array(z.enum(LANGUAGE_CODES as [string, ...string[]]))
      .min(1, "Pick at least one native language")
      .max(4),
    targetLanguages: z
      .array(
        z.object({
          code: z.enum(LANGUAGE_CODES as [string, ...string[]]),
          level: z.enum(CEFR_LEVELS),
        }),
      )
      .min(1, "Pick at least one language to learn")
      .max(6),
  })
  .refine(
    (p) => {
      const native = new Set(p.nativeLanguages);
      return p.targetLanguages.every((t) => !native.has(t.code));
    },
    { message: "A language cannot be both native and target" },
  )
  .refine(
    (p) => new Set(p.targetLanguages.map((t) => t.code)).size === p.targetLanguages.length,
    { message: "Duplicate target language" },
  );

export const GET = apiHandler(async () => {
  const session = await requireSession();
  const languages = await db.languageProfile.findMany({
    where: { userId: session.sub },
  });
  return NextResponse.json({
    nativeLanguages: languages.filter((l) => l.kind === "NATIVE").map((l) => l.languageCode),
    targetLanguages: languages
      .filter((l) => l.kind === "TARGET")
      .map((l) => ({ code: l.languageCode, level: l.level })),
  });
});

/** Replaces the user's language profile atomically. */
export const PUT = apiHandler(async (req: NextRequest) => {
  const session = await requireSession();
  const body = await parseBody(req, profileSchema);

  await db.$transaction([
    db.languageProfile.deleteMany({ where: { userId: session.sub } }),
    db.languageProfile.createMany({
      data: [
        ...body.nativeLanguages.map((code) => ({
          userId: session.sub,
          languageCode: code,
          kind: "NATIVE" as const,
        })),
        ...body.targetLanguages.map((t) => ({
          userId: session.sub,
          languageCode: t.code,
          kind: "TARGET" as const,
          level: t.level,
        })),
      ],
    }),
  ]);

  return NextResponse.json({ ok: true });
});
