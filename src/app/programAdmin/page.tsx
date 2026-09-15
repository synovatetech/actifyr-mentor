"use client";

// ============================================
// Program Admin Landing Route
// Resolves the active program (from the URL or localStorage) and redirects
// straight into Mentees. If no program is active, sends the mentor back to
// the Programs list to pick one.
// ============================================

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageLoader } from "@/components/ui/Loader";

export default function ProgramAdminLandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const urlProgramId = searchParams.get("programId");
    if (urlProgramId) {
      localStorage.setItem("activeProgramId", urlProgramId);
      router.replace(`/programAdmin/mentees?programId=${urlProgramId}`);
      return;
    }

    const savedProgramId = localStorage.getItem("activeProgramId");
    if (savedProgramId) {
      router.replace(`/programAdmin/mentees?programId=${savedProgramId}`);
      return;
    }

    router.replace("/programs");
  }, [searchParams, router]);

  return <PageLoader />;
}
