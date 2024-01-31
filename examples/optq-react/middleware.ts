import { NextResponse } from "next/server";

export function middleware() {
  const response = NextResponse.next();

  response.headers.set("access-control-expose-headers", "x-responded-at");
  response.headers.set("x-responded-at", Date.now().toString());

  return response;
}

export const config = {
  matcher: "/api/(.*)",
};
