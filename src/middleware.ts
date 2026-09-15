
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { canAccessRoute, ACCESS_DENIED_REDIRECT } from '@/lib/routeAccess';

const protectedRoutes = [
    '/programs',
    '/programAdmin',
    '/feedbacks',
    '/support',
];
const authRoutes = ['/login', '/forgot-password', '/reset-password'];

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const planType = request.cookies.get('plan_type')?.value;
    const { pathname } = request.nextUrl;

    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

    // Unauthenticated → login
    if (isProtectedRoute && !token) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('token');
        return response;
    }

    // Already authenticated → skip auth pages
    if (isAuthRoute && token) {
        return NextResponse.redirect(new URL('/programs', request.url));
    }

    // Plan-based route access (best-effort: only when plan_type cookie is present).
    // AuthGuard enforces the same check client-side as a reliable fallback for the
    // first request before the cookie is written.
    if (token && planType && isProtectedRoute) {
        if (!canAccessRoute(planType, pathname)) {
            return NextResponse.redirect(new URL(ACCESS_DENIED_REDIRECT, request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, svgs, etc)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.jpg|.*\\.png|.*\\.svg).*)',
    ],
};
