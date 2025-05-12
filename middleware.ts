import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Sayfa kategorilerini belirleyen yardımcı fonksiyonlar
function isAuthPage(pathname: string): boolean {
  return pathname.startsWith("/login") || pathname.startsWith("/register");
}

function isAdminPage(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

function isPublicPage(pathname: string): boolean {
  return pathname === "/" || pathname === "/about";
}

function isProtectedPage(pathname: string): boolean {
  return (
    pathname.startsWith("/home") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/singleplayer") ||
    pathname.startsWith("/multiplayer")
  );
}

// NextAuth middleware ile yönlendirme ve erişim kontrolü
export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    const isAuth = !!token;
    
    console.log(`[Middleware] Path: ${pathname}, Auth: ${isAuth}, Role: ${token?.role}`);

    // 1. Admin sayfası - sadece admin rolündekiler erişebilir
    if (isAdminPage(pathname)) {
      if (!isAuth) {
        console.log("[Middleware] Unauthenticated user trying to access admin page, redirecting to login");
        return NextResponse.redirect(new URL("/login", req.url));
      }
      
      if (token.role !== "admin") {
        console.log("[Middleware] Non-admin user trying to access admin page, redirecting to home");
        return NextResponse.redirect(new URL("/home", req.url));
      }
      
      console.log("[Middleware] Admin access granted");
      return NextResponse.next();
    }
    
    // 2. Auth sayfaları - giriş yapmış kullanıcılar home'a yönlendirilir
    if (isAuthPage(pathname) && isAuth) {
      console.log("[Middleware] Authenticated user on auth page, redirecting to home");
      return NextResponse.redirect(new URL("/home", req.url));
    }
    
    // 3. Korumalı sayfalar - giriş yapmamış kullanıcılar login'e yönlendirilir
    if (isProtectedPage(pathname) && !isAuth) {
      console.log("[Middleware] Unauthenticated user trying to access protected page, redirecting to login");
      return NextResponse.redirect(new URL("/login", req.url));
    }
    
    // 4. Diğer tüm durumlarda devam et
    return NextResponse.next();
  },
  {
    callbacks: {
      // Giriş kontrolü - herhangi bir sayfa için genel kontrol
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Auth sayfaları ve public sayfalar her zaman erişilebilir
        if (isAuthPage(pathname) || isPublicPage(pathname)) {
          return true;
        }
        
        // Admin sayfaları için admin rolü gerekli
        if (isAdminPage(pathname)) {
          return token?.role === "admin";
        }
        
        // Korumalı sayfalar için giriş yapmış olma gerekli
        if (isProtectedPage(pathname)) {
          return !!token;
        }
        
        // Diğer tüm sayfalar için erişim serbest
        return true;
      }
    },
    pages: {
      signIn: "/login",
      error: "/login"
    }
  }
);

// Middleware'in işleyeceği rotalar
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};