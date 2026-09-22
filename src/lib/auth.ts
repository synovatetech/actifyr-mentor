
export const setToken = (token: string) => {
    if (typeof document !== 'undefined') {
        document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Strict`;
    }
};

export const setRefreshToken = (token: string) => {
    if (typeof document !== 'undefined') {
        document.cookie = `refresh_token=${token}; path=/; max-age=604800; SameSite=Strict`; // 7 days
    }
};

export const getToken = (): string | null => {
    if (typeof document !== 'undefined') {
        const match = document.cookie.match(new RegExp('(^| )token=([^;]+)'));
        if (match) return match[2];
    }
    return null;
};

export const getRefreshToken = (): string | null => {
    if (typeof document !== 'undefined') {
        const match = document.cookie.match(new RegExp('(^| )refresh_token=([^;]+)'));
        if (match) return match[2];
    }
    return null;
};

// NOTE: `token`/`refresh_token` are httpOnly cookies as of the /mentor/me
// integration (set server-side in src/app/api/auth/mentor/login/route.ts),
// so these getters/setters can no longer actually read or write them from
// client JS — that's the point of httpOnly. They're left in place only
// because a few unrelated, unreachable content-management services still
// import getToken(); the live auth flow (client.ts, AuthGuard, auth.service)
// no longer calls any of these.
export const removeToken = () => {
    if (typeof document !== 'undefined') {
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    }
};
