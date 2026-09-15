import { MeResponse } from "@/types/auth";
import { create } from "zustand";

interface AuthState {
  authenticated: boolean;
  user: MeResponse | null;
  current_active_plan: string;
  current_active_plan_type: string;
  available_license_count: number;
  available_ai_token_count: number;
  available_whatsapp_credit_count: number;
  setUser: (user: MeResponse) => void;
  setAuthenticated: (authenticated: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  authenticated: false,
  user: null,
  current_active_plan: "",
  current_active_plan_type: "trial",
  available_license_count: 0,
  available_ai_token_count: 0,
  available_whatsapp_credit_count: 0,
  setUser: (user: MeResponse) =>
    set({
      user,
      authenticated: true,
      current_active_plan: user.current_active_plan || "",
      current_active_plan_type: user.current_active_plan_type || "trial",
      available_license_count: user.available_license_count || 0,
      available_ai_token_count: user.available_ai_token_count || 0,
      available_whatsapp_credit_count: user.available_whatsapp_credit_count || 0,
    }),
  setAuthenticated: (authenticated: boolean) => set({ authenticated }),
  logout: () =>
    set({
      user: null,
      authenticated: false,
      current_active_plan: "",
      current_active_plan_type: "trial",
      available_license_count: 0,
      available_ai_token_count: 0,
      available_whatsapp_credit_count: 0,
    }),
}));
