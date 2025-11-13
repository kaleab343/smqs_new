import { type NextRequest, NextResponse } from "next/server"

// TODO: Implement proper middleware for route protection
// This will be enhanced once authentication API is set up
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|placeholder.svg).*)"],
}
