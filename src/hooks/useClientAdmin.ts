"use client";

import { useEffect, useCallback } from "react";
import { clientAdminService } from "@/services/api/clientAdmin.service";
import { useClientStore } from "@/store/clientStore";

export function useClientAdmin() {
  const {
    clientData,
    loading,
    error,
    hasFetched,
    setClientData,
    setLoading,
    setError,
  } = useClientStore();

  const fetchClientData = useCallback(
    async (force = false) => {
      // Only fetch if no data or forced
      if (hasFetched && !force) return;

      setLoading(true);
      try {
        const res = await clientAdminService.getMe();
        if (res.success) {
          setClientData(res.data);
        } else {
          setError(res.error || "Failed to fetch client data");
        }
      } catch (err) {
        setError("An error occurred while fetching client data");
      } finally {
        setLoading(false);
      }
    },
    [hasFetched, setClientData, setError, setLoading],
  );

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  const availableAiTokenCount =
    clientData?.available_ai_token_count ?? clientData?.tokens ?? 0;
  const availableWhatsappCreditCount =
    clientData?.available_whatsapp_credit_count ?? clientData?.credits ?? 0;
  const availableLicenseCount =
    clientData?.available_license_count ?? clientData?.licenses ?? 0;
  const clientRefId = clientData?.client_ref_id ?? clientData?.ref_id ?? "";
  const clientType = clientData?.type ?? clientData?.client_type ?? "";
  const clientStatus = clientData?.status ?? "";
  const phone = clientData?.phone ?? clientData?.mobile ?? "";
  const gstId = clientData?.gst_id ?? clientData?.gstin ?? "";
  const licenseAutoRenewal = clientData?.license_auto_renewal ?? false;

  const isTrial =
    clientType === "trial_client" ||
    clientData?.current_active_plan_type === "trial";

  const trialDaysLeft = (() => {
    if (!isTrial) return 0;
    const regDateStr = clientData?.registration_date;
    if (!regDateStr) return 0;
    const trialEnd = new Date(regDateStr);
    trialEnd.setDate(trialEnd.getDate() + 30);
    const diff = Math.ceil(
      (trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    return Math.max(0, diff);
  })();

  const currentActivePlanDuration = clientData?.current_active_plan_duration ?? null;

  // The license period runs from today (the earliest a program can start)
  // for current_active_plan_duration days.
  const licenseEndDate = (() => {
    if (!currentActivePlanDuration) return null;
    const end = new Date();
    end.setDate(end.getDate() + currentActivePlanDuration);
    return end;
  })();

  const licenseEndDateStr = licenseEndDate
    ? licenseEndDate.toISOString().split("T")[0]
    : "";

  return {
    clientData,
    loading,
    error,
    refetch: () => fetchClientData(true),
    current_active_plan:
      clientData?.current_active_plan ||
      clientData?.current_plan ||
      clientData?.plan_name ||
      "",
    current_active_plan_type:
      clientData?.current_active_plan_type ||
      clientData?.current_plan ||
      clientData?.plan_type ||
      "retail",
    available_ai_token_count: availableAiTokenCount,
    available_whatsapp_credit_count: availableWhatsappCreditCount,
    available_license_count: availableLicenseCount,
    current_active_plan_duration: currentActivePlanDuration,
    licenseEndDate,
    licenseEndDateStr,
    tokens: availableAiTokenCount,
    credits: availableWhatsappCreditCount,
    licenses: availableLicenseCount,
    client_id: clientData?.client_id ?? null,
    client_ref_id: clientRefId,
    ref_id: clientRefId,
    name: clientData?.name || "",
    email: clientData?.email || "",
    phone,
    mobile: phone,
    address: clientData?.address || "",
    state: clientData?.state || "",
    city: clientData?.city || "",
    pincode: clientData?.pincode || "",
    organization: clientData?.organization || "",
    isTrial,
    trialDaysLeft,
    type: clientType,
    client_type: clientType,
    country: clientData?.country || "",
    gst_id: gstId,
    gstin: gstId,
    license_auto_renewal: licenseAutoRenewal,
    registration_date: clientData?.registration_date || "",
    subscription_newsletter: clientData?.subscription_newsletter ?? false,
    status: clientStatus,
    current_status: clientStatus,
    userName: clientData?.name || "User",
    userInitial: (clientData?.name?.[0] || "U").toUpperCase(),
    userLogo: clientData?.client_logo_url || null,
    logoUrl: clientData?.logo_url || "/logo.svg",
  };
}
