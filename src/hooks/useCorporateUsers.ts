'use client';

import { useMutation } from '@tanstack/react-query';
import {
  corporateUsersService,
  type BulkRenewResponse,
} from '@/services/api/corporateUsers.service';

/** Bulk-renews every corporate user currently in "expired" status, using the `["all"]`
 * sentinel so the backend (the sole source of truth for who is expired) resolves the
 * set itself rather than us paging the user list and filtering client-side. All-or-
 * nothing: a seat shortfall throws (402) and renews nobody — callers should still
 * inspect `failed` on success, since ids that can never be renewed (e.g. deactivated)
 * are reported there without affecting the rest of the batch. */
export function useRenewAllExpiredCorporateUsers() {
  return useMutation({
    mutationFn: async (): Promise<BulkRenewResponse> => {
      const res = await corporateUsersService.bulkRenew(['all']);
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to renew expired licenses');
      }
      return res.data;
    },
  });
}
