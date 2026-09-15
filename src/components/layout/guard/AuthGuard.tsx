"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import Image from "next/image";
import { getToken } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";
import { useClientStore } from "@/store/clientStore";
import { removeToken } from "@/lib/auth";
import { clientAdminService } from "@/services/api/clientAdmin.service";
import { canAccessRoute, ACCESS_DENIED_REDIRECT } from "@/lib/routeAccess";

let authVerificationPromise: Promise<void> | null = null;

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuthStore();
  const { hasFetched, clientData, setClientData, reset } = useClientStore();
  const hasDetails = hasFetched && Boolean(clientData);

  // Avoid hydration mismatch: never read cookies during render.
  // If details are already present in the Zustand store, we can safely render children.
  const [hasToken, setHasToken] = useState(() => hasDetails);
  const [isLoadingDetails, setIsLoadingDetails] = useState(() => !hasDetails);

  useEffect(() => {
    const nextTokenPresent = Boolean(getToken());
    setHasToken(nextTokenPresent);

    // Only show overlay when we don't already have details.
    if (nextTokenPresent) {
      setIsLoadingDetails(!(hasFetched && clientData));
      return;
    }

    // Clear any stale client-side auth state before leaving.
    logout();
    router.replace("/login");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, logout]);

  useEffect(() => {
    if (!hasToken) return;
    if (hasFetched && clientData) return;

    if (!authVerificationPromise) {
      authVerificationPromise = (async () => {
        try {
          const response = await clientAdminService.getMe();
          if (!response.success || !response.data) {
            throw new Error(response.error || "Failed to fetch client profile");
          }
          setClientData(response.data);
        } catch (error) {
          console.error("AuthGuard details fetch failed:", error);
          removeToken();
          reset();
          logout();
          router.replace("/login");
        }
      })().finally(() => {
        authVerificationPromise = null;
      });
    }

    setIsLoadingDetails(true);
    authVerificationPromise.finally(() => {
      setIsLoadingDetails(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasToken, hasFetched, clientData, setClientData, reset, logout, router]);

  // Persist plan type in a cookie so middleware can enforce access on subsequent requests.
  useEffect(() => {
    if (!hasFetched || !clientData) return;
    const planType = clientData.current_active_plan_type ?? "retail";
    document.cookie = `plan_type=${planType}; path=/; SameSite=Lax`;
  }, [hasFetched, clientData]);

  // Client-side route access guard — reliable fallback for the first load before
  // the plan_type cookie is available to middleware.
  useEffect(() => {
    if (!hasFetched || !clientData) return;
    const planType = clientData.current_active_plan_type ?? "retail";
    if (!canAccessRoute(planType, pathname)) {
      router.replace(ACCESS_DENIED_REDIRECT);
    }
  }, [hasFetched, clientData, pathname, router]);

  if (!hasToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center flex items-center animate-pulse">
          <Image src="/logo.svg" alt="logo" width={180} height={83} />
        </div>
      </div>
    );
  }

  if (isLoadingDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center flex items-center animate-pulse">
          <Image src="/logo.svg" alt="logo" width={180} height={83} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
