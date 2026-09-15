"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useClientStore } from "@/store/clientStore";
import { clientAdminService } from "@/services/api/clientAdmin.service";
import { plansService, type CountryOption, type GstStateCode } from "@/services/api/plans.service";
import { useToast } from "@/context/ToastContext";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AddressForm {
  full_address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

interface AccountForm {
  full_name: string;
  organization_name: string;
  mobile_number: string;
  address: AddressForm;
}

interface BillingForm {
  billing_name: string;
  billing_address: AddressForm;
  gst_number: string;
}

const emptyAddress: AddressForm = {
  full_address: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
};

const isIndia = (c: string) => {
  const n = c.trim().toLowerCase();
  return n === "india" || n === "in";
};

const formatAddress = (addr: AddressForm) =>
  [addr.full_address, addr.city, addr.state, addr.country, addr.pincode]
    .filter(Boolean)
    .join(", ") || "-";

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const clientData = useClientStore((s) => s.clientData);
  const setClientData = useClientStore((s) => s.setClientData);
  const { showToast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isEditingBilling, setIsEditingBilling] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isSavingBilling, setIsSavingBilling] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [stateCodes, setStateCodes] = useState<GstStateCode[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [accountForm, setAccountForm] = useState<AccountForm>({
    full_name: "",
    organization_name: "",
    mobile_number: "",
    address: { ...emptyAddress },
  });

  const [billingForm, setBillingForm] = useState<BillingForm>({
    billing_name: "",
    billing_address: { ...emptyAddress },
    gst_number: "",
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const [statesRes, countriesRes] = await Promise.all([
        plansService.getStateCodes(),
        plansService.getCountries(""),
      ]);
      if (statesRes.success) setStateCodes(statesRes.data || []);
      if (countriesRes.success) setCountries(countriesRes.data || []);
    })();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const cd = clientData;
    setAccountForm({
      full_name: cd?.name || "",
      organization_name: cd?.organization || "",
      mobile_number: cd?.phone || cd?.mobile || "",
      address: {
        full_address: cd?.address || cd?.account_details?.address?.full_address || "",
        city: cd?.city || cd?.account_details?.address?.city || "",
        state: cd?.state || cd?.account_details?.address?.state || "",
        country: cd?.country || cd?.account_details?.address?.country || "",
        pincode: cd?.pincode || cd?.account_details?.address?.pincode || "",
      },
    });
    setBillingForm({
      billing_name: cd?.billing_name || cd?.billing_info?.billing_name || cd?.organization || cd?.name || "",
      billing_address: {
        full_address: cd?.billing_address || cd?.billing_info?.billing_address?.full_address || cd?.address || "",
        city: cd?.billing_city || cd?.billing_info?.billing_address?.city || cd?.city || "",
        state: cd?.billing_state || cd?.billing_info?.billing_address?.state || cd?.state || "",
        country: cd?.billing_country || cd?.billing_info?.billing_address?.country || cd?.country || "",
        pincode: cd?.billing_pincode || cd?.billing_info?.billing_address?.pincode || cd?.pincode || "",
      },
      gst_number: cd?.gst_id || cd?.gstin || cd?.billing_info?.gst_number || "",
    });
    setIsEditingAccount(false);
    setIsEditingBilling(false);
    setAvatarPreview(null);
  }, [isOpen, clientData]);

  const buildPayload = () => ({
    account_details: {
      full_name: accountForm.full_name.trim(),
      organization_name: accountForm.organization_name.trim(),
      mobile_number: accountForm.mobile_number.trim(),
      address: {
        full_address: accountForm.address.full_address.trim(),
        city: accountForm.address.city.trim(),
        state: accountForm.address.state.trim(),
        country: accountForm.address.country.trim(),
        pincode: accountForm.address.pincode.trim(),
      },
    },
    billing_info: {
      billing_name: billingForm.billing_name.trim(),
      billing_address: {
        full_address: billingForm.billing_address.full_address.trim(),
        city: billingForm.billing_address.city.trim(),
        state: billingForm.billing_address.state.trim(),
        country: billingForm.billing_address.country.trim(),
        pincode: billingForm.billing_address.pincode.trim(),
      },
      gst_number: billingForm.gst_number.trim(),
    },
  });

  const handleSaveAccount = async () => {
    if (!clientData) return;
    setIsSavingAccount(true);
    try {
      const res = await clientAdminService.updateMe(buildPayload());
      if (res.success) {
        setClientData({
          ...clientData,
          name: accountForm.full_name.trim(),
          organization: accountForm.organization_name.trim(),
          phone: accountForm.mobile_number.trim() || null,
          address: accountForm.address.full_address.trim() || null,
          city: accountForm.address.city.trim() || null,
          state: accountForm.address.state.trim() || null,
          country: accountForm.address.country.trim() || null,
          pincode: accountForm.address.pincode.trim() || null,
          billing_name: billingForm.billing_name.trim() || null,
          billing_address: billingForm.billing_address.full_address.trim() || null,
          billing_city: billingForm.billing_address.city.trim() || null,
          billing_state: billingForm.billing_address.state.trim() || null,
          billing_country: billingForm.billing_address.country.trim() || null,
          billing_pincode: billingForm.billing_address.pincode.trim() || null,
          gst_id: billingForm.gst_number.trim() || null,
        });
        setIsEditingAccount(false);
        showToast("Account details updated", "success");
      } else {
        showToast(res.error || "Failed to update account", "error");
      }
    } catch {
      showToast("Failed to update account", "error");
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleSaveBilling = async () => {
    if (!clientData) return;
    setIsSavingBilling(true);
    try {
      const res = await clientAdminService.updateMe(buildPayload());
      if (res.success) {
        setClientData({
          ...clientData,
          name: accountForm.full_name.trim(),
          organization: accountForm.organization_name.trim(),
          phone: accountForm.mobile_number.trim() || null,
          address: accountForm.address.full_address.trim() || null,
          city: accountForm.address.city.trim() || null,
          state: accountForm.address.state.trim() || null,
          country: accountForm.address.country.trim() || null,
          pincode: accountForm.address.pincode.trim() || null,
          billing_name: billingForm.billing_name.trim() || null,
          billing_address: billingForm.billing_address.full_address.trim() || null,
          billing_city: billingForm.billing_address.city.trim() || null,
          billing_state: billingForm.billing_address.state.trim() || null,
          billing_country: billingForm.billing_address.country.trim() || null,
          billing_pincode: billingForm.billing_address.pincode.trim() || null,
          gst_id: billingForm.gst_number.trim() || null,
        });
        setIsEditingBilling(false);
        showToast("Billing info updated", "success");
      } else {
        showToast(res.error || "Failed to update billing info", "error");
      }
    } catch {
      showToast("Failed to update billing info", "error");
    } finally {
      setIsSavingBilling(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clientData) return;
    setAvatarPreview(URL.createObjectURL(file));
    setIsUploadingImage(true);
    try {
      const res = await clientAdminService.updateLogo(clientData.client_id, file);
      if (res.success) {
        const newUrl = res.data?.client_logo_url ?? res.data?.logo_url ?? avatarPreview;
        setClientData({ ...clientData, client_logo_url: newUrl });
        showToast("Profile image updated", "success");
      } else {
        showToast("Failed to update profile image", "error");
        setAvatarPreview(null);
      }
    } catch {
      showToast("Failed to update profile image", "error");
      setAvatarPreview(null);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const avatarSrc = avatarPreview || clientData?.client_logo_url || null;
  const initials = (clientData?.name || "U").charAt(0).toUpperCase();

  const inputCls =
    "flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-[14px] text-gray-900 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors bg-white";
  const selectCls =
    "flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-[14px] text-gray-900 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors bg-white appearance-none cursor-pointer";

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] overflow-y-auto bg-black/50"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-6">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-[680px]"
          style={{ fontFamily: "var(--font-sf-pro)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-7 pb-2">
            <h2 className="text-[22px] font-bold" style={{ color: "var(--color-primary)" }}>
              Profile
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100 cursor-pointer"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="px-8 pb-8 space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center py-4">
              <div className="relative">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="Profile"
                    className="w-28 h-28 rounded-full object-cover bg-gray-200"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-4xl font-medium select-none">{initials}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={isUploadingImage}
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 text-[14px] font-medium text-blue-600 hover:text-blue-700 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {isUploadingImage ? "Uploading..." : "Change Image"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Account Details Card */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4">
                <h3 className="text-[16px] font-bold" style={{ color: "var(--color-primary)" }}>
                  Account Details
                </h3>
                {isEditingAccount ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingAccount(false);
                        const cd = clientData;
                        setAccountForm({
                          full_name: cd?.name || "",
                          organization_name: cd?.organization || "",
                          mobile_number: cd?.phone || cd?.mobile || "",
                          address: {
                            full_address: cd?.address || "",
                            city: cd?.city || "",
                            state: cd?.state || "",
                            country: cd?.country || "",
                            pincode: cd?.pincode || "",
                          },
                        });
                      }}
                      className="text-[14px] text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSavingAccount}
                      onClick={handleSaveAccount}
                      className="text-[14px] font-semibold disabled:opacity-50 transition-colors cursor-pointer"
                      style={{ color: "var(--color-primary)" }}
                    >
                      {isSavingAccount ? "Saving..." : "Save"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingAccount(true)}
                    className="text-[14px] font-medium transition-colors cursor-pointer"
                    style={{ color: "var(--color-primary)" }}
                  >
                    Edit
                  </button>
                )}
              </div>

              <div className="divide-y divide-gray-100">
                {/* Full Name */}
                <div className="flex items-center px-6 py-3.5">
                  <span className="w-48 text-[14px] font-semibold text-gray-900 shrink-0">Your Full Name</span>
                  {isEditingAccount ? (
                    <input
                      type="text"
                      value={accountForm.full_name}
                      onChange={(e) => setAccountForm({ ...accountForm, full_name: e.target.value })}
                      className={inputCls}
                      placeholder="Enter full name"
                    />
                  ) : (
                    <span className="text-[14px] text-gray-800">{clientData?.name || "-"}</span>
                  )}
                </div>

                {/* Organization */}
                <div className="flex items-center px-6 py-3.5">
                  <span className="w-48 text-[14px] font-semibold text-gray-900 shrink-0">Organization Name</span>
                  {isEditingAccount ? (
                    <input
                      type="text"
                      value={accountForm.organization_name}
                      onChange={(e) => setAccountForm({ ...accountForm, organization_name: e.target.value })}
                      className={inputCls}
                      placeholder="Enter organization name"
                    />
                  ) : (
                    <span className="text-[14px] text-gray-800">{clientData?.organization || "-"}</span>
                  )}
                </div>

                {/* Mobile */}
                <div className="flex items-center px-6 py-3.5">
                  <span className="w-48 text-[14px] font-semibold text-gray-900 shrink-0">Mobile Number</span>
                  {isEditingAccount ? (
                    <input
                      type="tel"
                      value={accountForm.mobile_number}
                      onChange={(e) => setAccountForm({ ...accountForm, mobile_number: e.target.value })}
                      className={inputCls}
                      placeholder="Enter mobile number"
                    />
                  ) : (
                    <span className="text-[14px] text-gray-800">
                      {clientData?.phone || clientData?.mobile || "-"}
                    </span>
                  )}
                </div>

                {/* Email (read-only) */}
                <div className="flex items-center px-6 py-3.5">
                  <span className="w-48 text-[14px] font-semibold text-gray-900 shrink-0">Email Address</span>
                  <span className="text-[14px] text-gray-800">{clientData?.email || "-"}</span>
                </div>

                {/* Address — collapsed when viewing, expanded when editing */}
                {isEditingAccount ? (
                  <>
                    <div className="flex items-start px-6 py-3.5">
                      <span className="w-48 text-[14px] font-semibold text-gray-900 shrink-0 pt-0.5">
                        Full Address
                      </span>
                      <input
                        type="text"
                        value={accountForm.address.full_address}
                        onChange={(e) =>
                          setAccountForm({
                            ...accountForm,
                            address: { ...accountForm.address, full_address: e.target.value },
                          })
                        }
                        className={inputCls}
                        placeholder="Enter full address"
                      />
                    </div>

                    <div className="flex items-center px-6 py-3.5 gap-3">
                      <span className="w-48 text-[14px] font-semibold text-gray-900 shrink-0">Country</span>
                      <select
                        value={accountForm.address.country}
                        onChange={(e) => {
                          const country = e.target.value;
                          setAccountForm({
                            ...accountForm,
                            address: {
                              ...accountForm.address,
                              country,
                              state: isIndia(country) ? accountForm.address.state : "",
                            },
                          });
                        }}
                        className={selectCls}
                      >
                        <option value="">Select Country</option>
                        {countries.map((c) => (
                          <option key={c.code} value={c.name}>{c.name}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="flex items-center px-6 py-3.5 gap-3">
                      <span className="w-48 text-[14px] font-semibold text-gray-900 shrink-0">State</span>
                      {isIndia(accountForm.address.country) ? (
                        <select
                          value={accountForm.address.state}
                          onChange={(e) =>
                            setAccountForm({
                              ...accountForm,
                              address: { ...accountForm.address, state: e.target.value },
                            })
                          }
                          className={selectCls}
                        >
                          <option value="">Select State</option>
                          {stateCodes.map((s) => (
                            <option key={s.state_code} value={s.state_name}>{s.state_name}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={accountForm.address.state}
                          onChange={(e) =>
                            setAccountForm({
                              ...accountForm,
                              address: { ...accountForm.address, state: e.target.value },
                            })
                          }
                          className={inputCls}
                          placeholder="Enter state"
                        />
                      )}
                    </div>

                    <div className="flex items-center px-6 py-3.5 gap-3">
                      <span className="w-48 text-[14px] font-semibold text-gray-900 shrink-0">City</span>
                      <input
                        type="text"
                        value={accountForm.address.city}
                        onChange={(e) =>
                          setAccountForm({
                            ...accountForm,
                            address: { ...accountForm.address, city: e.target.value },
                          })
                        }
                        className={inputCls}
                        placeholder="Enter city"
                      />
                    </div>

                    <div className="flex items-center px-6 py-3.5 gap-3">
                      <span className="w-48 text-[14px] font-semibold text-gray-900 shrink-0">Pincode</span>
                      <input
                        type="text"
                        value={accountForm.address.pincode}
                        onChange={(e) =>
                          setAccountForm({
                            ...accountForm,
                            address: { ...accountForm.address, pincode: e.target.value },
                          })
                        }
                        className={inputCls}
                        placeholder="Enter pincode"
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-start px-6 py-3.5">
                    <span className="w-48 text-[14px] font-semibold text-gray-900 shrink-0 pt-0.5">Address</span>
                    <span className="text-[14px] text-gray-800 leading-relaxed">
                      {formatAddress({
                        full_address: clientData?.address || "",
                        city: clientData?.city || "",
                        state: clientData?.state || "",
                        country: clientData?.country || "",
                        pincode: clientData?.pincode || "",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Billing Info Card */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4">
                <h3 className="text-[16px] font-bold" style={{ color: "var(--color-primary)" }}>
                  Billing Info
                </h3>
                {isEditingBilling ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingBilling(false);
                        const cd = clientData;
                        setBillingForm({
                          billing_name: cd?.billing_name || cd?.billing_info?.billing_name || cd?.organization || cd?.name || "",
                          billing_address: {
                            full_address: cd?.billing_address || cd?.billing_info?.billing_address?.full_address || cd?.address || "",
                            city: cd?.billing_city || cd?.billing_info?.billing_address?.city || cd?.city || "",
                            state: cd?.billing_state || cd?.billing_info?.billing_address?.state || cd?.state || "",
                            country: cd?.billing_country || cd?.billing_info?.billing_address?.country || cd?.country || "",
                            pincode: cd?.billing_pincode || cd?.billing_info?.billing_address?.pincode || cd?.pincode || "",
                          },
                          gst_number: cd?.gst_id || cd?.gstin || cd?.billing_info?.gst_number || "",
                        });
                      }}
                      className="text-[14px] text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSavingBilling}
                      onClick={handleSaveBilling}
                      className="text-[14px] font-semibold disabled:opacity-50 transition-colors cursor-pointer"
                      style={{ color: "var(--color-primary)" }}
                    >
                      {isSavingBilling ? "Saving..." : "Save"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingBilling(true)}
                    className="text-[14px] font-medium transition-colors cursor-pointer"
                    style={{ color: "var(--color-primary)" }}
                  >
                    Edit
                  </button>
                )}
              </div>

              <div className="divide-y divide-gray-100">
                {/* Billing Name */}
                <div className="flex items-center px-6 py-3.5">
                  <span className="w-48 text-[14px] font-semibold text-gray-900 shrink-0">Billing Name</span>
                  {isEditingBilling ? (
                    <input
                      type="text"
                      value={billingForm.billing_name}
                      onChange={(e) => setBillingForm({ ...billingForm, billing_name: e.target.value })}
                      className={inputCls}
                      placeholder="Enter billing name"
                    />
                  ) : (
                    <span className="text-[14px] text-gray-800">
                      {clientData?.billing_name || clientData?.billing_info?.billing_name || clientData?.organization || clientData?.name || "-"}
                    </span>
                  )}
                </div>

                {/* GST */}
                <div className="flex items-center px-6 py-3.5">
                  <span className="w-48 text-[14px] font-semibold text-gray-900 shrink-0">GST Number</span>
                  {isEditingBilling ? (
                    <input
                      type="text"
                      value={billingForm.gst_number}
                      onChange={(e) => setBillingForm({ ...billingForm, gst_number: e.target.value })}
                      className={inputCls}
                      placeholder="Enter GST number"
                    />
                  ) : (
                    <span className="text-[14px] text-gray-800">
                      {clientData?.gst_id || clientData?.gstin || clientData?.billing_info?.gst_number || "-"}
                    </span>
                  )}
                </div>

                {/* Billing Address */}
                {isEditingBilling ? (
                  <>
                    <div className="flex items-start px-6 py-3.5">
                      <span className="w-48 text-[14px] font-semibold text-gray-900 shrink-0 pt-0.5">
                        Billing Address
                      </span>
                      <input
                        type="text"
                        value={billingForm.billing_address.full_address}
                        onChange={(e) =>
                          setBillingForm({
                            ...billingForm,
                            billing_address: { ...billingForm.billing_address, full_address: e.target.value },
                          })
                        }
                        className={inputCls}
                        placeholder="Enter billing address"
                      />
                    </div>

                    <div className="flex items-center px-6 py-3.5 gap-3">
                      <span className="w-48 text-[14px] font-semibold text-gray-900 shrink-0">Country</span>
                      <select
                        value={billingForm.billing_address.country}
                        onChange={(e) => {
                          const country = e.target.value;
                          setBillingForm({
                            ...billingForm,
                            billing_address: {
                              ...billingForm.billing_address,
                              country,
                              state: isIndia(country) ? billingForm.billing_address.state : "",
                            },
                          });
                        }}
                        className={selectCls}
                      >
                        <option value="">Select Country</option>
                        {countries.map((c) => (
                          <option key={c.code} value={c.name}>{c.name}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="flex items-center px-6 py-3.5 gap-3">
                      <span className="w-48 text-[14px] font-semibold text-gray-900 shrink-0">State</span>
                      {isIndia(billingForm.billing_address.country) ? (
                        <select
                          value={billingForm.billing_address.state}
                          onChange={(e) =>
                            setBillingForm({
                              ...billingForm,
                              billing_address: { ...billingForm.billing_address, state: e.target.value },
                            })
                          }
                          className={selectCls}
                        >
                          <option value="">Select State</option>
                          {stateCodes.map((s) => (
                            <option key={s.state_code} value={s.state_name}>{s.state_name}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={billingForm.billing_address.state}
                          onChange={(e) =>
                            setBillingForm({
                              ...billingForm,
                              billing_address: { ...billingForm.billing_address, state: e.target.value },
                            })
                          }
                          className={inputCls}
                          placeholder="Enter state"
                        />
                      )}
                    </div>

                    <div className="flex items-center px-6 py-3.5 gap-3">
                      <span className="w-48 text-[14px] font-semibold text-gray-900 shrink-0">City</span>
                      <input
                        type="text"
                        value={billingForm.billing_address.city}
                        onChange={(e) =>
                          setBillingForm({
                            ...billingForm,
                            billing_address: { ...billingForm.billing_address, city: e.target.value },
                          })
                        }
                        className={inputCls}
                        placeholder="Enter city"
                      />
                    </div>

                    <div className="flex items-center px-6 py-3.5 gap-3">
                      <span className="w-48 text-[14px] font-semibold text-gray-900 shrink-0">Pincode</span>
                      <input
                        type="text"
                        value={billingForm.billing_address.pincode}
                        onChange={(e) =>
                          setBillingForm({
                            ...billingForm,
                            billing_address: { ...billingForm.billing_address, pincode: e.target.value },
                          })
                        }
                        className={inputCls}
                        placeholder="Enter pincode"
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-start px-6 py-3.5">
                    <span className="w-48 text-[14px] font-semibold text-gray-900 shrink-0 pt-0.5">
                      Billing Address
                    </span>
                    <span className="text-[14px] text-gray-800 leading-relaxed">
                      {formatAddress({
                        full_address: clientData?.billing_address || clientData?.billing_info?.billing_address?.full_address || clientData?.address || "",
                        city: clientData?.billing_city || clientData?.billing_info?.billing_address?.city || clientData?.city || "",
                        state: clientData?.billing_state || clientData?.billing_info?.billing_address?.state || clientData?.state || "",
                        country: clientData?.billing_country || clientData?.billing_info?.billing_address?.country || clientData?.country || "",
                        pincode: clientData?.billing_pincode || clientData?.billing_info?.billing_address?.pincode || clientData?.pincode || "",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
