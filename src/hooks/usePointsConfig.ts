'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scoringService } from '@/services/api/scoring.service';
import { useToast } from '@/context/ToastContext';

export function usePointsConfig(programId: string | number | undefined) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const query = useQuery({
        queryKey: ['pointsConfig', programId],
        queryFn: async () => {
            const res = await scoringService.listPointConfigs(programId!);
            if (!res.success) throw new Error(res.error || 'Failed to fetch point configurations');
            return res.data ?? [];
        },
        enabled: !!programId,
    });

    const mutation = useMutation({
        mutationFn: ({
            configId,
            updates,
        }: {
            configId: string | number;
            updates: Record<string, unknown>;
        }) => scoringService.updatePointConfig(programId!, configId, updates),
        onSuccess: (res) => {
            if (res.success) {
                showToast('Points updated successfully', 'success');
                queryClient.invalidateQueries({ queryKey: ['pointsConfig', programId] });
            } else {
                showToast(res.error || 'Failed to update points', 'error');
            }
        },
        onError: () => {
            showToast('Failed to update points', 'error');
        },
    });

    return {
        data: query.data ?? [],
        isLoading: query.isLoading,
        update: (configId: string | number, updates: Record<string, unknown>) =>
            mutation.mutateAsync({ configId, updates }),
    };
}
