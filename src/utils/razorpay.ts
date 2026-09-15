"use client";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (
        event: string,
        handler: (response: Record<string, unknown>) => void,
      ) => void;
    };
  }
}

export type RazorpaySuccessPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayPrefill = {
  name?: string;
  email?: string;
  contact?: string;
};

type OpenRazorpayCheckoutOptions = {
  key: string;
  orderId: string;
  currency?: string;
  name?: string;
  description?: string;
  prefill?: RazorpayPrefill;
  themeColor?: string;
  onSuccess: (payload: RazorpaySuccessPayload) => Promise<void> | void;
  onDismiss?: () => void;
  onPaymentFailed?: (
    message: string,
    response: Record<string, unknown>,
  ) => void;
};

let razorpayScriptPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}

export async function openRazorpayCheckout({
  key,
  orderId,
  currency = "INR",
  name = "Actifyr",
  description = "Payment",
  prefill,
  themeColor = "#4F46E5",
  onSuccess,
  onDismiss,
  onPaymentFailed,
}: OpenRazorpayCheckoutOptions): Promise<void> {
  const scriptLoaded = await loadRazorpayScript();
  if (!scriptLoaded || typeof window === "undefined" || !window.Razorpay) {
    throw new Error("Razorpay SDK failed to load");
  }

  const razorpay = new window.Razorpay({
    key,
    order_id: orderId,
    currency,
    name,
    description,
    prefill,
    theme: {
      color: themeColor,
    },
    modal: {
      ondismiss: onDismiss,
    },
    handler: async (response: Record<string, unknown>) => {
      await onSuccess(response as RazorpaySuccessPayload);
    },
  });

  razorpay.on("payment.failed", (response) => {
    const paymentError = response?.error as { description?: string } | undefined;
    onPaymentFailed?.(
      paymentError?.description || "Payment failed. Please try again.",
      response,
    );
  });

  razorpay.open();
}
