"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import Image from "next/image";
import { getToken } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";
import { useClientStore } from "@/store/clientStore";
import { canAccessRoute, ACCESS_DENIED_REDIRECT } from "@/lib/routeAccess";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuthStore();
  const { hasFetched, clientData } = useClientStore();

  // Mentors have no `/me`-style endpoint to verify a token against (§2 of the
  // mentor API guide only exposes read-only `/client/*` routes), so a valid
  // `token` cookie is treated as sufficient — there is nothing else to check.
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    const tokenPresent = Boolean(getToken());
    setHasToken(tokenPresent);

    if (!tokenPresent) {
      logout();
      router.replace("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, logout]);

  // Best-effort plan-based route gating (currently inert: ROUTE_ACCESS/NAV_ACCESS
  // have no mentor entries, so this only takes effect if those maps grow).
  useEffect(() => {
    if (!hasFetched || !clientData) return;
    const planType = clientData.current_active_plan_type ?? "retail";
    if (!canAccessRoute(planType, pathname)) {
      router.replace(ACCESS_DENIED_REDIRECT);
    }
  }, [hasFetched, clientData, pathname, router]);

  if (hasToken === null || hasToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center flex items-center animate-pulse">
          <Image src="/logo-mentor.png" alt="Actifyr Mentor" width={195} height={89} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
