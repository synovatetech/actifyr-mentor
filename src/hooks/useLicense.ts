'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { licenseService } from '@/services/api/license.service';
import { clientAdminService } from '@/services/api/clientAdmin.service';

export const licenseKeys = {
  details: ['license', 'details'] as const,
};

export function useLicenseDetails() {
  return useQuery({
    queryKey: licenseKeys.details,
    queryFn: async () => {
      const res = await licenseService.details();
      if (!res.success) throw new Error(res.error || 'Unable to fetch license details');
      return res.data;
    },
  });
}

export function useInvalidateLicenseDetails() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: licenseKeys.details });
}

export function useCreateLicenseOrder() {
  return useMutation({
    mutationFn: (data: any) => licenseService.createOrder(data),
  });
}

export function useVerifyLicensePayment() {
  return useMutation({
    mutationFn: (data: any) => licenseService.verifyPayment(data),
  });
}

export function useLicenseInvoice() {
  return useMutation({
    mutationFn: (orderId: string | number) => licenseService.getInvoiceBlob(orderId),
  });
}

/** Corporate plans only — the API rejects this with 400 for any other plan type. */
export function useUpdateLicenseAutoRenewal() {
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await clientAdminService.updateLicenseAutoRenewal(enabled);
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to update auto-renewal');
      }
      return res.data;
    },
  });
}
