"use client";

function Bone({
  w = "100%",
  h = "14px",
  radius = "4px",
}: {
  w?: string;
  h?: string;
  radius?: string;
}) {
  return (
    <div
      className="animate-pulse bg-gray-200"
      style={{ width: w, height: h, borderRadius: radius, flexShrink: 0 }}
    />
  );
}

function WidgetSkeleton({
  statCount = 3,
  style,
}: {
  statCount?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--color-card-bg)",
        borderRadius: "9px",
        overflow: "hidden",
        boxShadow: "0px 1.8px 3.6px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      <div
        className="animate-pulse bg-gray-100"
        style={{ padding: "10.8px 14.4px", display: "flex", alignItems: "center", gap: "9px" }}
      >
        <Bone w="18px" h="18px" radius="4px" />
        <Bone w="90px" h="13px" />
      </div>
      <div
        style={{
          padding: "18px 14.4px",
          display: "flex",
          justifyContent: "space-between",
          gap: "18.5px",
        }}
      >
        {Array.from({ length: statCount }).map((_, i) => (
          <div
            key={i}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "7.2px", flex: 1 }}
          >
            <Bone w="65%" h="11px" />
            <Bone w="35%" h="16px" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityRowSkeleton({ last = false }: { last?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 0",
        borderBottom: last ? "none" : "1px solid rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <Bone w="220px" h="13px" />
        <Bone w="110px" h="10px" />
      </div>
      <Bone w="56px" h="24px" radius="4px" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "1200px",
        boxSizing: "border-box",
        padding: "0 20px",
      }}
    >
      {/* Page title — always visible, not part of skeleton */}
      <h1 style={{ fontFamily: "'SF Pro', -apple-system, BlinkMacSystemFont, sans-serif", fontWeight: 590, fontSize: "16.2px", lineHeight: "18.9px", color: "var(--color-foreground)", margin: "0 0 31.5px 0" }}>
        Dashboard
      </h1>

      {/* Main widget grid */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "24.3px", alignItems: "flex-start" }}>
        <WidgetSkeleton statCount={3} style={{ flex: 1, minWidth: "320px" }} />
        <WidgetSkeleton statCount={3} style={{ flex: 1, minWidth: "320px" }} />

        {/* Small 2×2 grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "24.3px",
            flex: 1,
          }}
        >
          <WidgetSkeleton statCount={1} />
          <WidgetSkeleton statCount={1} />
          <WidgetSkeleton statCount={1} />
          <WidgetSkeleton statCount={1} />
        </div>
      </div>

      {/* Recent Activity */}
      <div
        style={{
          marginTop: "24px",
          background: "var(--color-card-bg)",
          borderRadius: "9px",
          overflow: "hidden",
          boxShadow: "0px 1.8px 3.6px rgba(0,0,0,0.05)",
        }}
      >
        <div
          className="animate-pulse bg-gray-100"
          style={{ padding: "10.8px 14.4px", display: "flex", alignItems: "center", gap: "9px" }}
        >
          <Bone w="18px" h="18px" radius="4px" />
          <Bone w="120px" h="13px" />
        </div>
        <div style={{ padding: "4px 14.4px 4px" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <ActivityRowSkeleton key={i} last={i === 4} />
          ))}
        </div>
      </div>
    </div>
  );
}
