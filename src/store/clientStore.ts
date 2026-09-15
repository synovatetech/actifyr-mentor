import { create } from "zustand";

interface ClientData {
  client_id: number;
  client_ref_id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  state: string | null;
  city: string | null;
  pincode: string | null;
  organization: string | null;
  type: string;
  country: string;
  plan_id: number;
  gst_id: string | null;
  registration_date: string;
  subscription_newsletter: boolean;
  status: string;
  client_logo_url: string | null;
  current_active_plan: string;
  current_active_plan_type: string;
  available_license_count: number;
  available_ai_token_count: number;
  available_whatsapp_credit_count: number;
  trial_end_date?: string | null;
  plan_expiry_date?: string | null;
  /** Number of days the current active plan/license runs for, counted from today. */
  current_active_plan_duration?: number | null;
  /** Corporate plans only — whether expired corporate users auto-renew via the background job. */
  license_auto_renewal?: boolean;
}

interface ClientState {
  clientData: ClientData | any;
  loading: boolean;
  error: string | null;
  hasFetched: boolean;
  trialBannerDismissed: boolean;
  setClientData: (data: ClientData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  dismissTrialBanner: () => void;
  reset: () => void;
}

export const useClientStore = create<ClientState>((set) => ({
  clientData: null,
  loading: false,
  error: null,
  hasFetched: false,
  trialBannerDismissed: false,
  setClientData: (data) =>
    set({ clientData: data, loading: false, hasFetched: true }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  dismissTrialBanner: () => set({ trialBannerDismissed: true }),
  reset: () =>
    set({ clientData: null, hasFetched: false, error: null, loading: false, trialBannerDismissed: false }),
}));
