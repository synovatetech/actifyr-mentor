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

export function ProgramCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading program"
      style={{
        width: "100%",
        height: "333px",
        background: "#ffffff",
        boxShadow: "0px 1.8px 3.6px rgba(111,111,111,0.1)",
        borderRadius: "10.8px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          width: "100%",
          minHeight: "109.8px",
          background: "rgba(111,111,111,0.06)",
          borderRadius: "10.8px 10.8px 0 0",
          padding: "17.1px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          boxSizing: "border-box",
        }}
      >
        {/* headerMain row */}
        <div style={{ display: "flex", gap: "10.8px", alignItems: "flex-start" }}>
          {/* Image placeholder */}
          <Bone w="65px" h="65px" radius="5.4px" />

          {/* Info side */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", paddingLeft: "10.8px" }}>
            {/* Title row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
              <Bone w="60%" h="14px" />
              <Bone w="58px" h="22px" radius="5.4px" />
            </div>
            {/* Type label + facilitator */}
            <Bone w="30%" h="11px" radius="4px" />
            <Bone w="50%" h="11px" radius="4px" />
          </div>
        </div>

        {/* Description line */}
        <Bone w="75%" h="11px" radius="4px" />
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: "17.1px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          boxSizing: "border-box",
        }}
      >
        {/* Date info — 3 boxes */}
        <div style={{ display: "flex", gap: "8.1px" }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: "50.4px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                justifyContent: "center",
                padding: "7.2px 10.8px",
                border: "0.9px solid rgba(111,111,111,0.1)",
                borderRadius: "5.4px",
                boxSizing: "border-box",
              }}
            >
              <Bone w="70%" h="10px" />
              <Bone w="55%" h="12px" />
            </div>
          ))}
        </div>

        {/* Progress bars */}
        <div style={{ display: "flex", gap: "17.1px" }}>
          {[1, 2].map((i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", gap: "7px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Bone w="55%" h="11px" />
                <Bone w="20%" h="11px" />
              </div>
              <Bone w="100%" h="12.6px" radius="10.8px" />
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "18px" }}>
          {[1, 2].map((i) => (
            <Bone key={i} w="143px" h="42px" radius="5.4px" />
          ))}
        </div>
      </div>
    </div>
  );
}
