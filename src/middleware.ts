import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/cron", "/api/realtime"];

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (searchParams.get("clear_session") === "true") {
    const url = new URL("/login", request.url);
    const response = NextResponse.redirect(url);
    response.cookies.delete("better-auth.session_token");
    response.cookies.delete("drishti_user_id");
    response.cookies.delete("drishti_active_role");
    return response;
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const sessionCookie = getSessionCookie(request);
  const customSessionCookie = request.cookies.get("drishti_user_id");

  if (!isPublic && !sessionCookie && !customSessionCookie) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && (sessionCookie || customSessionCookie)) {
    // Do not redirect Server Actions
    if (!request.headers.has("next-action")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except static assets, fonts, and Next internals.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot)$).*)",
  ],
};

