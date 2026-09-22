import { NextRequest } from 'next/server';
import { proxyRequest } from '@/lib/server/apiProxy';

// Everything except /api/auth/mentor/{login,refresh,logout} (which have their
// own route files, taking precedence over this catch-all) goes through here:
// reads the httpOnly `token` cookie, attaches it as the Authorization header,
// and forwards to the real backend. The client never handles the token itself.
async function handler(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
