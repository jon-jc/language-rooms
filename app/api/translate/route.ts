import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler, parseBody, requireSession } from "@/lib/api";
import { translationProvider } from "@/lib/translation";
import { LANGUAGE_CODES } from "@/lib/languages";

const translateSchema = z.object({
  text: z.string().trim().min(1).max(500),
  targetLanguage: z.enum(LANGUAGE_CODES as [string, ...string[]]),
});

/** Support-panel translation assist (provider-backed; stub in dev). */
export const POST = apiHandler(async (req: NextRequest) => {
  await requireSession();
  const body = await parseBody(req, translateSchema);
  const result = await translationProvider().translate({
    text: body.text,
    targetLanguage: body.targetLanguage,
  });
  return NextResponse.json(result);
});
