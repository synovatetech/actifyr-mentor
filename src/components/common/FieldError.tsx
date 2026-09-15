"use client";

interface FieldErrorProps {
  message?: string;
}

export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <span
      style={{
        color: "#E53935",
        fontSize: "12px",
        marginTop: "2px",
        marginLeft: "5px",
        display: "block",
      }}
    >
      *{message}
    </span>
  );
}
