import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_BASE_URL, setAuthCookies } from '@/lib/server/apiProxy';

// The only route that WRITES the auth cookies, so it can't go through the
// generic proxy: the tokens must never reach client JS, only this server-side
// handler sees them, and it hands back the sanitized profile fields instead.
export async function POST(request: NextRequest) {
  const body = await request.text();

  const backendRes = await fetch(`${BACKEND_BASE_URL}/auth/mentor/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  const text = await backendRes.text();
  const data = text ? JSON.parse(text) : null;

  if (!backendRes.ok) {
    return NextResponse.json(data, { status: backendRes.status });
  }

  const response = NextResponse.json({
    mentor_id: data.mentor_id,
    name: data.name,
    email: data.email,
    role: data.role,
    password_changed: data.password_changed,
    password_changed_at: data.password_changed_at,
  });

  setAuthCookies(response, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  });

  return response;
}
