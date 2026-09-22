"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { mentorService } from "@/services/api/mentor.service";
import { useMentorStore } from "@/store/mentorStore";
import ChangePasswordModal from "@/components/features/auth/ChangePasswordModal";

interface AuthGuardProps {
  children: React.ReactNode;
}

type GuardStatus = "checking" | "ready" | "needs-password";

// The same screen is shown for the initial session check AND for the
// re-check after a password change, so that transition reads as one
// continuous flow instead of a flash between two different loaders.
export function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center flex items-center animate-pulse">
        <Image src="/logo-mentor.png" alt="Actifyr Mentor" width={195} height={89} />
      </div>
    </div>
  );
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const setMentor = useMentorStore((s) => s.setMentor);
  const [status, setStatus] = useState<GuardStatus>("checking");

  // GET /mentor/me is the single source of truth for whether the session is
  // valid AND whether the mentor still needs to change their password — no
  // local flag, no cookie, just this endpoint (per the API guide's behavior
  // notes: gate on password_changed from the login response or /mentor/me).
  const loadMe = useCallback(async () => {
    setStatus("checking");
    const res = await mentorService.getMe();
    if (!res.success || !res.data) {
      router.replace("/login");
      return;
    }

    setMentor({
      mentorId: res.data.mentor_id,
      mentorRefId: res.data.mentor_ref_id,
      userId: res.data.user_id,
      name: res.data.name,
      email: res.data.email,
      status: res.data.status,
      passwordChanged: res.data.password_changed,
      passwordChangedAt: res.data.password_changed_at,
      programs: res.data.programs,
      totalPrograms: res.data.total_programs,
      totalMentees: res.data.total_mentees,
    });

    setStatus(res.data.password_changed ? "ready" : "needs-password");
  }, [router, setMentor]);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  if (status === "ready") {
    return <>{children}</>;
  }

  if (status === "needs-password") {
    // No skip button — the mentor cannot enter the app until this succeeds.
    // onDone re-runs the same /mentor/me check (showing this same loading
    // screen again) before revealing children.
    return <ChangePasswordModal onDone={loadMe} />;
  }

  return <AuthLoadingScreen />;
}
