
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

export const removeToken = () => {
    if (typeof document !== 'undefined') {
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    }
};
