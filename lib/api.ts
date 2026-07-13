import { NextRequest, NextResponse } from "next/server";
import { ZodType } from "zod";
import { readSession, SessionPayload } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

const log = logger("api");

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status });
}

/** Parse + validate a JSON body against a Zod schema; 400 with details on failure. */
export async function parseBody<T>(
  req: NextRequest,
  schema: ZodType<T>,
): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new ApiError(400, "VALIDATION_ERROR", detail);
  }
  return parsed.data;
}

/** Session required; throws 401 otherwise. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await readSession();
  if (!session) {
    throw new ApiError(401, "UNAUTHENTICATED", "Sign in required");
  }
  return session;
}

/** Best-effort client IP (behind a proxy in prod, direct in dev). */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "127.0.0.1";
}

/**
 * Wrap a route handler with uniform error handling + structured logging.
 * ApiErrors map to their status; anything else is a logged 500 with no
 * internals leaked to the client.
 */
export function apiHandler(
  handler: (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse>,
) {
  return async (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return jsonError(err.status, err.code, err.message);
      }
      log.error(
        { err, path: req.nextUrl.pathname, method: req.method },
        "unhandled API error",
      );
      return jsonError(500, "INTERNAL", "Something went wrong");
    }
  };
}
