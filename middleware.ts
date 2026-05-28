import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = process.env.JWT_SECRET || 'yaadi-jwt-super-secret-key-2026-auth-session-key';
const key = new TextEncoder().encode(SECRET_KEY);
const SESSION_COOKIE_NAME = 'yaadi_session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Let public API routes, assets, share routes and home/register bypass middleware
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/share') ||
    pathname === '/logo.png' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  let session: any = null;
  if (cookie) {
    try {
      const { payload } = await jwtVerify(cookie, key, {
        algorithms: ['HS256'],
      });
      session = payload;
    } catch (e) {
      // Invalid session
    }
  }

  // Redirect unauthenticated requests to login page
  const authProtectedRoutes = ['/dashboard', '/contacts', '/tree', '/templates', '/approvals', '/admin'];
  const isAuthProtected = authProtectedRoutes.some(route => pathname.startsWith(route));

  if (!session && isAuthProtected) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Redirect authenticated requests away from login/register pages
  if (session && (pathname === '/' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect non-admins away from admin/approvals routes
  const adminRoutes = ['/admin', '/approvals'];
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));

  if (session && isAdminRoute && !session.isAdmin) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico).*)'],
};
