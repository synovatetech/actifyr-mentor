
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

export interface MentorProfile {
    mentorId: number;
    name: string;
    email: string;
    role?: string;
}

// There is no `/auth/mentor/me` endpoint — the login response is the only place
// mentor_id/name/email come from, so we cache them here (mirroring the token
// cookies) instead of re-deriving them from a client-only endpoint.
export const setMentorProfile = (profile: MentorProfile) => {
    if (typeof document !== 'undefined') {
        document.cookie = `mentor_profile=${encodeURIComponent(JSON.stringify(profile))}; path=/; max-age=604800; SameSite=Strict`;
    }
};

export const getMentorProfile = (): MentorProfile | null => {
    if (typeof document !== 'undefined') {
        const match = document.cookie.match(new RegExp('(^| )mentor_profile=([^;]+)'));
        if (match) {
            try {
                return JSON.parse(decodeURIComponent(match[2]));
            } catch {
                return null;
            }
        }
    }
    return null;
};

export const removeMentorProfile = () => {
    if (typeof document !== 'undefined') {
        document.cookie = 'mentor_profile=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    }
};
