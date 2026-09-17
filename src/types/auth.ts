export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface MentorLoginRequest {
  email: string;
  password: string;
}

export interface MentorLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  role: string;
  mentor_id: number;
  name: string;
  email: string;
}

export interface MeResponse {
  // Existing fields (kept as-is)
  user_id: number;
  email: string;
  phone: string | null;
  name: string;

  // Extended fields from new /client/me payload
  client_id?: number;
  client_ref_id?: string;
  address?: string | null;
  type?: string;
  country?: string | null;
  gst_id?: string | null;
  organization?: string | null;
  registration_date?: string;
  subscription_newsletter?: boolean;
  status?: string;
  client_logo_url?: string | null;
  current_active_plan?: string;
  current_active_plan_type?:
    | "trial"
    | "retail"
    | "corporate"
    | "custom"
    | string;
  available_license_count?: number;
  available_ai_token_count?: number;
  available_whatsapp_credit_count?: number;
  /** Number of days the current active plan/license runs for, counted from today. */
  current_active_plan_duration?: number;
}
