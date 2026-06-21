import { NextResponse } from "next/server";

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

export function json(
  data: unknown,
  init?: number | ResponseInit,
): NextResponse {
  const responseInit = typeof init === "number" ? { status: init } : init;
  return NextResponse.json(data, responseInit);
}

export function tooManyRequests(resetSeconds: number) {
  return NextResponse.json(
    { error: "Too many requests. Please slow down." },
    { status: 429, headers: { "Retry-After": String(resetSeconds) } },
  );
}
