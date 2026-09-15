'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MentorsService } from '@/services/api/mentors.service';

export interface Mentor {
  id: string;
  mentorId: string;
  name: string;
  email: string;
  createdOn: string;
  status: 'Active' | 'Inactive';
  programs: { title: string }[];
}

function mapMentor(m: any): Mentor {
  return {
    id: String(m.id),
    mentorId: m.mentor_ref_id || '-',
    name: m.name || '-',
    email: m.email || '-',
    createdOn:
      m.created_on ||
      new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    status: m.status === 'active' || m.status === 'Active' ? 'Active' : 'Inactive',
    programs: Array.isArray(m.programs)
      ? m.programs
          .map((p: any) => ({ title: String(p?.title || '').trim() }))
          .filter((p: { title: string }) => Boolean(p.title))
      : [],
  };
}

export function useMentors() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['mentors'] });

  const { data: mentors = [], isPending: loading } = useQuery({
    queryKey: ['mentors'],
    queryFn: async () => {
      const res = await MentorsService.getMentors();
      if (!res.success) throw new Error((res as any).error || 'Failed to fetch mentors');
      const raw = (res.data as any)?.mentors ?? res.data;
      return (Array.isArray(raw) ? raw : []).map(mapMentor);
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; email: string }) =>
      MentorsService.createMentor({ ...payload, status: 'active' }),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, status }: { id: string; name: string; status: string }) =>
      MentorsService.updateMentor(id, { name, status }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => MentorsService.deleteMentor(id),
    onSuccess: invalidate,
  });

  return {
    mentors,
    loading,
    createMentor: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateMentor: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteMentor: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
