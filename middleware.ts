import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/register");
    const isGamePage = req.nextUrl.pathname.startsWith("/singleplayer/play") || req.nextUrl.pathname.startsWith("/multiplayer/game");

    // If on auth page and authenticated, redirect to home
    if (isAuthPage && isAuth) {
      return NextResponse.redirect(new URL("/home", req.url));
    }

    // If not authenticated and trying to access protected route, redirect to login
    if (!isAuth && !isAuthPage && !isGamePage) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
    pages: {
      signIn: "/login",
      error: "/login"
    }
  }
);

export const config = {
  matcher: [
    "/home/:path*",
    "/singleplayer/:path*",
    "/multiplayer/:path*",
    "/profile/:path*",
    "/login",
    "/register"
  ]
};