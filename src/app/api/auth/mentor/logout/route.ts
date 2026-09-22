import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/server/apiProxy';

// Purely local: the API guide has no backend logout endpoint, this just
// clears the httpOnly cookies, which only server-side code can do.
export async function POST() {
  const response = NextResponse.json({ success: true });
  clearAuthCookies(response);
  return response;
}
