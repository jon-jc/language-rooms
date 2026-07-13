import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { destroySessionCookie } from "@/lib/auth/session";

/** Used as a plain <form> action, so respond with a redirect, not JSON. */
export const POST = apiHandler(async (req: NextRequest) => {
  await destroySessionCookie();
  return NextResponse.redirect(new URL("/", req.url), 303);
});
