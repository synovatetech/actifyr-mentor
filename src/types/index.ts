// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// ============================================
// API Plan (backend shape)
// ============================================

export interface ApiPlan {
  id: number;
  parent_id: number | null;
  name: string;
  plan_metadata: {
    features: string[];
    description: string;
    highlight_flag: string;
  };
  duration: number | null;
  price: number;
  plan_type: "trial" | "retail" | "corporate" | "custom";
  is_active: boolean;
  is_custom: boolean;
  is_trial: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// Plan Types - Exact Figma Design
// ============================================

export interface PlanDuration {
  label: string;
  sublabel: string;
  value: number;
  price?: number | null;
  selected?: boolean;
  planId?: number;
  duration?: number;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number | null;
  currency: string;
  priceLabel?: string;
  priceSuffix?: string;
  priceText?: string;
  features: string[];
  buttonText: string;
  badge: string | null;
  badgeColor?: string;
  hasDurationToggle: boolean;
  durations?: PlanDuration[];
  isCustom?: boolean;
  type: "trial" | "retail" | "corporate" | "custom";
}

// ============================================
// Order Types
// ============================================

export interface CreateOrderRequest {
  profile_details: {
    name: string;
    organization: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    subscription_newsletter: boolean;
  };
  order_details: {
    license_plan_id: number;
    license_plan_quantity: number;
    license_plan_promo_code: string;
    billing_name: string;
    billing_email: string;
    same_as_above: boolean;
    billing_address: string;
    billing_city: string;
    billing_state: string;
    billing_pincode: string;
    billing_country: string;
    gst_number: string;
    agreed_t_and_c: boolean;
    agreed_privacy_policy: boolean;
  };
}

export interface CreateOrderResponse {
  success?: boolean;
  data?: {
    order_id?: number;
    order_ref_code?: string;
    razorpay_order_id?: string;
    razorpay_amount?: number;
    razorpay_currency?: string;
    razorpay_key_id?: string;
    billing_name?: string;
    billing_email?: string;
    license_plan_cost?: number;
    discount?: number;
    total_cost?: number;
    order_quantity?: number;
  };
  order_id?: number;
  order_ref_code?: string;
  razorpay_order_id?: string;
  razorpay_amount?: number;
  razorpay_currency?: string;
  razorpay_key_id?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  order_id: number;
  order_ref_code: string;
  order_status: "payment_completed" | string;
  razorpay_payment_id: string;
  purchase_id: number;
  purchase_ref_code: string;
}

// ============================================
// Navigation Types
// ============================================

export interface NavItem {
  id: string;
  label: string;
  href: string;
}

// ============================================
// Footer Types
// ============================================

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterSection {
  title: string;
  items: FooterLink[];
}

export interface FooterData {
  brand: {
    name: string;
    description: string;
  };
  links: FooterSection[];
  copyright: string;
}

export type ButtonVariant = "primary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

// ============================================
// Program Types
// ============================================

export interface Program {
  id: string;
  programId: string;
  title: string;
  description?: string;
  companyName?: string;
  facilitator: string;
  workshopDate?: string;
  imageUrl?: string;
  meetingLink?: string;
  meeting_link?: string;
  leaderBoardType?: string;
  pi1Title?: string;
  pi2Title?: string;
  rating: number | null;
  ratingCount?: number;
  status: "active" | "inactive" | "draft" | "expired";
  visibility?: "public" | "private" | "none";
  startDate: string;
  endDate: string;
  duration: string;
  learningEngagement: number; // percentage
  learningEffectiveness: number; // percentage
  cohortSize: number;
  usersJoined: number;
  licenseSize?: number;
  licenseJoined?: number;
  learningEngagementAvgScore?: number | null;
  learningEffectivenessAvgScore?: number | null;
  isAIGenerated?: boolean;
  isAIGenerating?: boolean;
  notificationTime?: string;
  notificationTimeTwo?: string;
  timeZone?: string;
  notificationContent?: string;
  notificationContentTwo?: string;
  modifiedBy?: string;
  totalContent?: number;
  contentIncludeDays?: number[];
  holidays?: string[];
  duplicatedFromProgramId?: number | null;
  journeyImageKey?: string | null;
  type?:
    | "scheduled_learning"
    | "modular_learning"
    | "journey_learning"
    | string;
  /** Language IDs selected when the program was created (e.g. ["hi", "ml"]). */
  languages?: string[];
  /** Per-language translation entries returned by the API. */
  translations?: Array<{
    language_code: string;
    title: string;
    description: string;
    company_name: string;
    facilitator_name: string;
    notification_content: string;
    notification_content_two: string;
    pi_1_title: string;
    pi_2_title: string;
  }>;
}

export interface SidebarNavItem {
  id: string;
  label: string;
  href: string;
  icon?: string | React.ComponentType<{ className?: string }>;
  active?: boolean;
}
