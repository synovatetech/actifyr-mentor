import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Server-only: the real backend host. NEXT_PUBLIC_API_BASE_URL is read here
// too (not just by the client) because with httpOnly auth cookies, only this
// server-side code can attach the Authorization header — the browser only
// ever talks to this app's own /api/* routes.
export const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 24; // 1 day, mirrors jwt_expires_min default
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge,
});

export function setAuthCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken?: string },
) {
  response.cookies.set(
    "token",
    tokens.accessToken,
    cookieOptions(ACCESS_TOKEN_MAX_AGE),
  );
  if (tokens.refreshToken) {
    response.cookies.set(
      "refresh_token",
      tokens.refreshToken,
      cookieOptions(REFRESH_TOKEN_MAX_AGE),
    );
  }
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.delete("token");
  response.cookies.delete("refresh_token");
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/auth/mentor/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.access_token ?? null;
  } catch {
    return null;
  }
}

// Forwards a request to the real backend, attaching the Authorization header
// from the httpOnly `token` cookie (the client never sees or sets this
// header itself). On a 401, transparently refreshes once using the httpOnly
// `refresh_token` cookie and retries — the client only ever sees a 401 if the
// refresh also failed, at which point the session is genuinely over.
export async function proxyRequest(
  request: NextRequest,
  path: string[],
): Promise<NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  const targetUrl = `${BACKEND_BASE_URL}/${path.join("/")}${
    request.nextUrl.search
  }`;
  const contentType = request.headers.get("content-type");
  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.blob() : undefined;

  const buildHeaders = (bearer?: string): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (contentType) headers["Content-Type"] = contentType;
    if (bearer) headers["Authorization"] = `Bearer ${bearer}`;
    return headers;
  };

  let backendRes = await fetch(targetUrl, {
    method: request.method,
    headers: buildHeaders(token),
    body,
  });

  let refreshedToken: string | null = null;
  if (backendRes.status === 401 && refreshToken) {
    refreshedToken = await refreshAccessToken(refreshToken);
    if (refreshedToken) {
      backendRes = await fetch(targetUrl, {
        method: request.method,
        headers: buildHeaders(refreshedToken),
        body,
      });
    }
  }

  const responseText = await backendRes.text();
  const response = new NextResponse(responseText, {
    status: backendRes.status,
    headers: {
      "Content-Type":
        backendRes.headers.get("content-type") || "application/json",
    },
  });

  if (refreshedToken) {
    setAuthCookies(response, { accessToken: refreshedToken });
  } else if (backendRes.status === 401 && refreshToken) {
    // Refresh was attempted and failed — the session is over.
    clearAuthCookies(response);
  }

  return response;
}
