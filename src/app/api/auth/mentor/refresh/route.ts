import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_BASE_URL, setAuthCookies, clearAuthCookies } from '@/lib/server/apiProxy';

// Used directly by the client only to proactively refresh; the generic proxy
// (apiProxy.ts) also calls the backend refresh endpoint itself on a 401, so
// this route is a convenience, not the only path that can refresh.
export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: 'No active session' }, { status: 401 });
  }

  const backendRes = await fetch(`${BACKEND_BASE_URL}/auth/mentor/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const text = await backendRes.text();
  const data = text ? JSON.parse(text) : null;

  if (!backendRes.ok) {
    const response = NextResponse.json(data, { status: backendRes.status });
    clearAuthCookies(response);
    return response;
  }

  const response = NextResponse.json({ success: true });
  setAuthCookies(response, { accessToken: data.access_token });
  return response;
}
