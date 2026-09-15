import toast from "react-hot-toast";
import type { ToastPosition } from "react-hot-toast";

/**
 * Toast utility functions for displaying success and error notifications
 * All toast styling and configuration is centralized here
 */

/**
 * Extract error message from AxiosError or return the error message string
 * Handles various error response structures:
 * - error.response.data[0].message (array with first element having message)
 * - error.response.data.message (direct message property)
 * - error.response.data.error (alternative error property)
 * - error.message (axios error message)
 * - error.response.statusText (HTTP status text)
 * - Generic fallback message
 * @param error - AxiosError or string
 * @returns The extracted error message
 */
export const getErrorMessage = (error: any | string): string => {
  // If it's already a string, return it
  if (typeof error === "string") {
    return error;
  }

  // If it's an AxiosError, extract the message
  if (error.response?.data) {
    const data = error.response.data as { errors?: { message: string }[] };

    // Check for array with first element having message
    if (
      Array.isArray(data.errors) &&
      data.errors.length > 0 &&
      data.errors[0]?.message
    ) {
      return data.errors[0].message;
    }

    // Check for direct message property
    if (typeof data === "object" && "message" in data && data.message) {
      return String(data.message);
    }

    // Check for error property
    if (typeof data === "object" && "error" in data && data.error) {
      return String(data.error);
    }
  }

  // Fallback to axios error message
  if (error.message) {
    return error.message;
  }

  // Fallback to status text
  if (error.response?.statusText) {
    return error.response.statusText;
  }

  // Generic fallback
  return "An error occurred. Please try again.";
};

/**
 * Display a success toast notification
 * @param message - The message to display in the toast
 */
export const successToast = (
  message: string,
  position: ToastPosition = "top-right",
) => {
  toast.success(message, {
    duration: 2000,
    position,
    id: "success-toast",
    style: {
      background: "#10b981",
      color: "#fff",
      borderRadius: "8px",
      padding: "12px 16px",
      fontSize: "14px",
      fontWeight: "500",
    },
    iconTheme: {
      primary: "#fff",
      secondary: "#10b981",
    },
  });
};

/**
 * Display an error toast notification
 * @param error - AxiosError or string message to display in the toast
 */
export const errorToast = (
  error: any | string,
  position: ToastPosition = "top-right",
) => {
  const message = getErrorMessage(error);

  toast.error(message, {
    duration: 2000,
    position,
    id: "error-toast",
    style: {
      background: "#ef4444",
      color: "#fff",
      borderRadius: "8px",
      padding: "12px 16px",
      fontSize: "14px",
      fontWeight: "500",
    },
    iconTheme: {
      primary: "#fff",
      secondary: "#ef4444",
    },
  });
};
