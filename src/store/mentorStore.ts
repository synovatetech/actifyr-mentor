import { create } from 'zustand';

export interface MentorProgram {
    program_id: number;
    program_ref_id: string;
    title: string;
    status: string;
    type: string;
    start_date: string;
    end_date: string;
    client_id: number;
    client_name: string;
    mentee_count: number;
}

export interface MentorProfile {
    mentorId: number;
    mentorRefId: string;
    userId: number;
    name: string;
    email: string;
    status: string;
    passwordChanged: boolean;
    passwordChangedAt: string | null;
    programs: MentorProgram[];
    totalPrograms: number;
    totalMentees: number;
}

interface MentorState {
    mentor: MentorProfile | null;
    setMentor: (mentor: MentorProfile) => void;
    reset: () => void;
}

// Populated once by AuthGuard's GET /mentor/me call — the single source of
// truth for the signed-in mentor's identity, programs and password_changed
// status. Nothing here is persisted to a cookie or localStorage; it lives
// only in memory for the session, matching the /mentor/me integration.
export const useMentorStore = create<MentorState>((set) => ({
    mentor: null,
    setMentor: (mentor) => set({ mentor }),
    reset: () => set({ mentor: null }),
}));
