"use client";

import styles from "@/styles/create-program.module.css";

function SkeletonBlock({ w = "100%", h = "45px", radius = "5.4px" }: { w?: string; h?: string; radius?: string }) {
  return (
    <div
      className="animate-pulse bg-gray-200"
      style={{ width: w, height: h, borderRadius: radius, flexShrink: 0 }}
    />
  );
}

function SkeletonLabel({ w = "35%" }: { w?: string }) {
  return (
    <div
      className="animate-pulse bg-gray-200"
      style={{ width: w, height: "14px", borderRadius: "4px", marginBottom: "9px" }}
    />
  );
}

function SkeletonSection({ children }: { children: React.ReactNode }) {
  return <section className={styles.section}>{children}</section>;
}

export function DuplicateProgramSkeleton() {
  return (
    <div className={styles.pageWrapper} role="status" aria-label="Loading program">
      {/* Page title */}
      <div className="animate-pulse bg-gray-200" style={{ width: 180, height: 18, borderRadius: 5, marginBottom: 21.6 }} />

      <div className={styles.form}>

        {/* ── Add Program Details ─────────────────── */}
        <SkeletonSection>
          {/* Section title */}
          <div className="animate-pulse bg-gray-200" style={{ width: 160, height: 16, borderRadius: 4, marginBottom: 21.6 }} />
          <div className={styles.row}>
            {/* Left column — 4 fields */}
            <div className={styles.leftColumn} style={{ gap: 18, display: "flex", flexDirection: "column" }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  <SkeletonLabel w={i === 2 ? "50%" : "40%"} />
                  <SkeletonBlock h={i === 2 ? "112px" : "45px"} />
                </div>
              ))}
            </div>
            {/* Right column — logo */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
              <SkeletonLabel w="45%" />
              <SkeletonBlock w="302px" h="203px" />
              <SkeletonBlock w="240px" h="13px" radius="4px" />
              <SkeletonBlock w="200px" h="13px" radius="4px" />
              <SkeletonBlock w="180px" h="13px" radius="4px" />
            </div>
          </div>
        </SkeletonSection>

        {/* ── Set Visibility ──────────────────────── */}
        <SkeletonSection>
          <div className="animate-pulse bg-gray-200" style={{ width: 200, height: 16, borderRadius: 4, marginBottom: 21.6 }} />
          <div style={{ display: "flex", gap: 35, flexWrap: "wrap" }}>
            {[1, 2].map((i) => (
              <SkeletonBlock key={i} w="calc(50% - 17.5px)" h="120px" />
            ))}
          </div>
        </SkeletonSection>

        {/* ── Select Program Track ─────────────────── */}
        <SkeletonSection>
          <div className="animate-pulse bg-gray-200" style={{ width: 180, height: 16, borderRadius: 4, marginBottom: 21.6 }} />
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            {[1, 2, 3].map((i) => (
              <SkeletonBlock key={i} w="calc(33.3% - 12px)" h="160px" />
            ))}
          </div>
        </SkeletonSection>

        {/* ── Choose Program Type ──────────────────── */}
        <SkeletonSection>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 21.6 }}>
            <div className="animate-pulse bg-gray-200" style={{ width: 180, height: 16, borderRadius: 4 }} />
            <div className="animate-pulse bg-gray-200" style={{ width: 200, height: 14, borderRadius: 4 }} />
          </div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            {[1, 2, 3].map((i) => (
              <SkeletonBlock key={i} w="calc(33.3% - 12px)" h="190px" />
            ))}
          </div>
        </SkeletonSection>

        {/* ── Program Schedule ─────────────────────── */}
        <SkeletonSection>
          <div className="animate-pulse bg-gray-200" style={{ width: 160, height: 16, borderRadius: 4, marginBottom: 21.6 }} />
          <div style={{ display: "flex", gap: 35, flexWrap: "wrap" }}>
            {[1, 2].map((i) => (
              <div key={i} style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 8 }}>
                <SkeletonLabel w="45%" />
                <SkeletonBlock w="80%" h="12px" radius="4px" />
                <SkeletonBlock h="45px" />
              </div>
            ))}
          </div>
          {/* Timezone */}
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <SkeletonLabel w="30%" />
            <SkeletonBlock w="80%" h="12px" radius="4px" />
            <SkeletonBlock h="45px" />
          </div>
        </SkeletonSection>

        {/* ── Content Schedule ─────────────────────── */}
        <SkeletonSection>
          <div className="animate-pulse bg-gray-200" style={{ width: 160, height: 16, borderRadius: 4, marginBottom: 14 }} />
          <SkeletonLabel w="55%" />
          <SkeletonBlock w="70%" h="12px" radius="4px" />
          {/* Day chips row */}
          <div style={{ display: "flex", gap: 10, marginTop: 26, paddingTop: 12 }}>
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} style={{ flex: 1 }}>
                <SkeletonBlock h="66px" radius="8px" />
              </div>
            ))}
          </div>
          {/* Exclude dates */}
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <SkeletonLabel w="35%" />
            <SkeletonBlock w="60%" h="12px" radius="4px" />
            <SkeletonBlock w="60%" h="12px" radius="4px" />
            <SkeletonBlock w="340px" h="45px" />
          </div>
        </SkeletonSection>

        {/* ── Copy Other Program Content ───────────── */}
        <SkeletonSection>
          <div className="animate-pulse bg-gray-200" style={{ width: 220, height: 16, borderRadius: 4, marginBottom: 12 }} />
          <SkeletonLabel w="50%" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 14 }}>
            {[130, 120, 140, 100, 110, 95, 190, 170, 155, 160, 185].map((w, i) => (
              <SkeletonBlock key={i} w={`${w}px`} h="38px" radius="5.4px" />
            ))}
          </div>
        </SkeletonSection>

        {/* ── Notification Settings ────────────────── */}
        <SkeletonSection>
          <div className="animate-pulse bg-gray-200" style={{ width: 190, height: 16, borderRadius: 4, marginBottom: 21.6 }} />
          <div style={{ display: "flex", gap: 35, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 8 }}>
              <SkeletonLabel w="60%" />
              <SkeletonBlock w="60%" h="12px" radius="4px" />
              <div style={{ display: "flex", gap: 10 }}>
                <SkeletonBlock w="80px" h="45px" />
                <SkeletonBlock w="80px" h="45px" />
                <SkeletonBlock w="80px" h="45px" />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 8 }}>
              <SkeletonLabel w="45%" />
              <SkeletonBlock w="60%" h="12px" radius="4px" />
              <SkeletonBlock h="84px" />
            </div>
          </div>
        </SkeletonSection>

        {/* ── Other Configurations ─────────────────── */}
        <SkeletonSection>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
            <div className="animate-pulse bg-gray-200" style={{ width: 180, height: 16, borderRadius: 4 }} />
            <div className="animate-pulse bg-gray-200" style={{ width: 220, height: 14, borderRadius: 4 }} />
          </div>
          <SkeletonBlock w="60%" h="12px" radius="4px" />
          <div style={{ display: "flex", gap: 35, marginTop: 21.6, flexWrap: "wrap" }}>
            {[1, 2].map((i) => (
              <div key={i} style={{ width: 450, maxWidth: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                <SkeletonLabel w="50%" />
                <SkeletonBlock h="45px" />
              </div>
            ))}
          </div>
          <div style={{ height: 0.9, background: "rgba(111,111,111,0.1)", margin: "21.6px 0" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 450, maxWidth: "100%" }}>
            <SkeletonLabel w="30%" />
            <SkeletonBlock w="70%" h="12px" radius="4px" />
            <SkeletonBlock h="45px" />
          </div>
        </SkeletonSection>

        {/* ── Action buttons ───────────────────────── */}
        <div className={styles.buttonGroup}>
          <SkeletonBlock w="171px" h="45px" />
          <SkeletonBlock w="261px" h="45px" />
        </div>

      </div>
    </div>
  );
}
