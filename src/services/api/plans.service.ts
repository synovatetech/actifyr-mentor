// ============================================
// Plans API Service - Real API Integration
// ============================================

import { apiClient } from "./client";
import type {
  ApiResponse,
  ApiPlan,
  Plan,
  PlanDuration,
  CreateOrderRequest,
  CreateOrderResponse,
  VerifyPaymentResponse,
} from "@/types";

export interface GstStateCode {
  state_code: string;
  state_name: string;
}

export interface CountryOption {
  name: string;
  code: string;
}

export interface TrialProfileDetails {
  name: string;
  organization: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  phone: string;
  email: string;
  subscription_newsletter: boolean;
}

export interface CouponValidationResponse {
  status: boolean;
  message: string;
  code?: string;
  description?: string;
  type?: "percentage" | "fixed";
  value?: number;
}

// UI-only metadata (button labels, suffixes, styling) per plan type
const PLAN_UI: Record<string, Partial<Plan>> = {
  trial: {
    badge: null,
    badgeColor: "",
    buttonText: "Start Free Trial",
    priceLabel: "For 30 Days",
    priceSuffix: "",
    hasDurationToggle: false,
  },
  retail: {
    badge: "Most Popular",
    badgeColor: "#00B625",
    buttonText: "Buy Retail Plan",
    priceLabel: "",
    priceSuffix: "/license",
    hasDurationToggle: true,
  },
  corporate: {
    badge: "Designed for Corporates",
    badgeColor: "#00A0FF",
    buttonText: "Buy Corporate Plan",
    priceLabel: "Renew Yearly",
    priceSuffix: "/license/year",
    hasDurationToggle: false,
  },
  custom: {
    badge: null,
    buttonText: "Contact",
    priceLabel: "",
    priceSuffix: "",
    priceText: "Contact our Sales Team",
    hasDurationToggle: false,
    isCustom: true,
  },
};

const mapApiToPlan = (apiPlan: ApiPlan): Plan => {
  const type = (apiPlan.plan_type?.toLowerCase() || "retail") as Plan["type"];
  const ui = PLAN_UI[type] || PLAN_UI["retail"];

  return {
    id: apiPlan.id?.toString() || type,
    name: apiPlan.name || "",
    description: apiPlan.plan_metadata?.description || "",
    price: apiPlan.price ?? 0,
    currency: "₹",
    type,
    ...ui,
    badge:
      apiPlan.plan_metadata?.highlight_flag ||
      ui.badge ||
      (type === "retail"
        ? "Most Popular"
        : type === "corporate"
          ? "Designed for Corporates"
          : null),
    features: apiPlan.plan_metadata?.features || [],
  } as Plan;
};

export const plansService = {
  getStateCodes: async (): Promise<ApiResponse<GstStateCode[]>> => {
    const response = await apiClient.get<any>(
      "/client/license-plan/state-codes",
    );

    if (response.success && response.data) {
      const data = response.data as
        | {
            state_codes?: GstStateCode[];
            data?: { state_codes?: GstStateCode[] };
          }
        | GstStateCode[];
      const stateCodes = Array.isArray(data)
        ? data
        : data.state_codes || data.data?.state_codes || [];

      return {
        ...response,
        data: Array.isArray(stateCodes) ? stateCodes : [],
      };
    }

    return {
      success: false,
      data: [],
      error: response.error || "Failed to fetch state codes",
    };
  },

  getCountries: async (
    searchText = "",
  ): Promise<ApiResponse<CountryOption[]>> => {
    const response = await apiClient.get<any>(
      `/client/license-plan/countries?search_text=${encodeURIComponent(searchText)}`,
    );

    if (response.success && response.data) {
      const data = response.data as
        | {
            countries?: CountryOption[];
            data?: { countries?: CountryOption[] };
          }
        | CountryOption[];
      const countries = Array.isArray(data)
        ? data
        : data.countries || data.data?.countries || [];

      return {
        ...response,
        data: Array.isArray(countries) ? countries : [],
      };
    }

    return {
      success: false,
      data: [],
      error: response.error || "Failed to fetch countries",
    };
  },

  validateCoupon: async (
    code: string,
  ): Promise<ApiResponse<CouponValidationResponse>> => {
    return apiClient.get<CouponValidationResponse>(
      `/client/license-plan/validate-coupon?code=${encodeURIComponent(code)}`,
    );
  },

  getPlans: async (): Promise<ApiResponse<Plan[]>> => {
    const response = await apiClient.get<any>("/client/license-plan/list");

    if (response.success && response.data) {
      const apiPlans: ApiPlan[] = response.data.license_plans || response.data;
      if (!Array.isArray(apiPlans)) {
        return { success: false, data: [], error: "Invalid response format" };
      }

      const trialApi = apiPlans.find((p) => p.plan_type === "trial");
      const corporateApi = apiPlans.find(
        (p) => p.plan_type === "corporate" && p.parent_id === null,
      );
      const customApi = apiPlans.find(
        (p) => p.plan_type === "custom" || p.is_custom,
      );

      const retailChildren = apiPlans
        .filter(
          (p) =>
            p.plan_type === "retail" &&
            p.parent_id !== null &&
            p.duration !== null,
        )
        .sort((a, b) => (a.duration || 0) - (b.duration || 0));
      const retailParent = apiPlans.find(
        (p) => p.plan_type === "retail" && p.parent_id === null,
      );

      const finalPlans: Plan[] = [];

      if (trialApi) finalPlans.push(mapApiToPlan(trialApi));

      // Build single retail card with duration toggle from child plans
      if (retailChildren.length > 0 || retailParent) {
        const ui = PLAN_UI["retail"];
        const baseRetail = retailParent || retailChildren[0];

        const durations: PlanDuration[] = retailChildren.map((rp) => {
          const months = Math.round((rp.duration || 0) / 30);
          const isPopular = rp.plan_metadata?.highlight_flag === "Most Popular";
          return {
            label: months.toString().padStart(2, "0"),
            sublabel: "Months",
            value: months,
            planId: rp.id,
            price: rp.price ?? 0,
            duration: rp.duration || 0,
            selected: isPopular || months === 6,
          };
        });

        const selectedDuration =
          durations.find((d) => d.selected) || durations[1] || durations[0];

        const badgeFromChild = retailChildren.find(
          (p) => p.plan_metadata?.highlight_flag,
        )?.plan_metadata?.highlight_flag;

        const retailCard: Plan = {
          id: selectedDuration?.planId?.toString() || baseRetail.id.toString(),
          name: baseRetail.name || "Retail",
          type: "retail",
          description: baseRetail.plan_metadata?.description || "",
          price: selectedDuration?.price ?? 0,
          currency: "₹",
          badge:
            badgeFromChild ||
            baseRetail.plan_metadata?.highlight_flag ||
            ui.badge ||
            "Most Popular",
          badgeColor: ui.badgeColor,
          buttonText: ui.buttonText || "Buy Retail Plan",
          priceLabel: ui.priceLabel,
          priceSuffix: ui.priceSuffix || "/license",
          hasDurationToggle: true,
          durations,
          features: baseRetail.plan_metadata?.features || [],
        };

        finalPlans.push(retailCard);
      }

      if (corporateApi) {
        finalPlans.push(mapApiToPlan(corporateApi));
      }

      if (customApi) {
        finalPlans.push(mapApiToPlan(customApi));
      } else {
        const customUi = PLAN_UI["custom"];
        finalPlans.push({
          id: "custom",
          name: "Custom",
          type: "custom",
          description: "",
          price: null,
          currency: "₹",
          badge: null,
          buttonText: customUi.buttonText || "Contact",
          hasDurationToggle: false,
          features: [],
          isCustom: true,
          priceText: customUi.priceText,
        } as Plan);
      }

      return { ...response, data: finalPlans };
    }

    return {
      success: false,
      data: [],
      error: response.error || "Failed to fetch plans",
    };
  },

  getPlanDetails: async (
    planId: number,
  ): Promise<ApiResponse<ApiPlan | null>> => {
    const response = await apiClient.get<any>("/client/license-plan/list");
    if (response.success && response.data) {
      const apiPlans: ApiPlan[] = response.data.license_plans || response.data;
      if (Array.isArray(apiPlans)) {
        const found = apiPlans.find((p) => p.id === planId);
        return { success: true, data: found || null };
      }
    }
    return {
      success: false,
      data: null,
      error: response.error || "Failed to fetch plan details",
    };
  },

  createOrder: async (
    orderData: CreateOrderRequest,
  ): Promise<ApiResponse<CreateOrderResponse>> => {
    return apiClient.post<CreateOrderResponse>(
      "/client/license-plan/order",
      orderData,
    );
  },

  createTrialOrder: async (
    profileDetails: TrialProfileDetails,
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.post<Record<string, unknown>>(
      "/client/license-plan/order",
      { profile_details: profileDetails },
    );
  },

  activateTrial: async (payload: {
    full_name: string;
    organization_name: string;
    mobile_number: string;
    address: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  }): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.post<Record<string, unknown>>(
      "/client/license-plan/activate-trial",
      payload,
    );
  },

  verifyPayment: async (paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<ApiResponse<VerifyPaymentResponse>> => {
    return apiClient.post<VerifyPaymentResponse>(
      "/client/license-plan/order/verify",
      paymentData,
    );
  },

  deletePlan: async (planId: string): Promise<ApiResponse<unknown>> => {
    return apiClient.delete(`/client/program/${planId}`);
  },
};
