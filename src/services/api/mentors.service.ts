import { apiClient } from './client';

export interface MentorPayload {
    name: string;
    email: string;
    status: string;
}

export interface MentorUpdatePayload {
    name: string;
    status: string;
}

export const MentorsService = {
    getMentors: () => {
        return apiClient.get('/client/mentor');
    },

    getProgramMentors: (programId: string | number) => {
        return apiClient.get(`/client/mentor/programs/${programId}/mentors`);
    },

    createMentor: (data: MentorPayload) => {
        return apiClient.post('/client/mentor', data);
    },

    updateMentor: (id: string | number, data: MentorUpdatePayload) => {
        return apiClient.put(`/client/mentor/${id}`, data);
    },

    deleteMentor: (id: string | number) => {
        return apiClient.delete(`/client/mentor/${id}`);
    },

    assignMentorToProgram: (mentorId: string | number, programId: string | number) => {
        return apiClient.post(`/client/mentor/${mentorId}/programs/${programId}`);
    },

    unassignMentorFromProgram: (mentorId: string | number, programId: string | number) => {
        return apiClient.delete(`/client/mentor/${mentorId}/programs/${programId}`);
    },
};
