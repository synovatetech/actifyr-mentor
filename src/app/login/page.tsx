"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "@/components/features/auth/AuthLayout";
import ChangePasswordModal from "@/components/features/auth/ChangePasswordModal";
import { authService } from "@/services/api/auth.service";
import { errorToast } from "@/utils/toast";
import styles from "@/styles/auth.module.css";

const INVALID_CREDENTIALS_MESSAGE =
  "The username or password you entered is incorrect. Please try again";

const passwordPromptKey = (mentorId: number) => `mentor_pwd_prompted:${mentorId}`;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordPromptState, setPasswordPromptState] = useState<{
    mentorId: number;
    currentPassword: string;
  } | null>(null);

  const goToPrograms = () => {
    // Redirect is handled by middleware but we force it here for better UX
    router.push("/programs");
    router.refresh(); // Refresh to update server components/middleware state
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authService.login({ email, password });
      if (response.success) {
        const mentorId = response.data?.mentor_id;
        const alreadyPrompted =
          mentorId != null &&
          typeof window !== "undefined" &&
          window.localStorage.getItem(passwordPromptKey(mentorId)) === "1";

        if (mentorId != null && !alreadyPrompted) {
          setPasswordPromptState({ mentorId, currentPassword: password });
          return;
        }

        goToPrograms();
      } else {
        const loginError =
          response.error || "Login failed. Please check your credentials.";
        const normalizedError = loginError.toLowerCase();
        const isInvalidCredentialsError =
          normalizedError.includes("invalid") ||
          normalizedError.includes("incorrect") ||
          normalizedError.includes("credential") ||
          normalizedError.includes("unauthorized");

        const errorMessage = isInvalidCredentialsError
          ? INVALID_CREDENTIALS_MESSAGE
          : loginError;

        errorToast(errorMessage);
      }
    } catch (err) {
      const errorMessage = "An unexpected error occurred. Please try again.";
      errorToast(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordPromptDone = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        passwordPromptKey(passwordPromptState!.mentorId),
        "1",
      );
    }
    setPasswordPromptState(null);
    goToPrograms();
  };

  if (passwordPromptState) {
    return (
      <ChangePasswordModal
        currentPassword={passwordPromptState.currentPassword}
        onDone={handlePasswordPromptDone}
      />
    );
  }

  return (
    <AuthLayout>
      <h1 className={styles.title}>Login to your account</h1>

      <form onSubmit={handleLogin}>
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="login-email">
            Email Address
          </label>
          <input
            id="login-email"
            type="email"
            className={styles.input}
            placeholder="abc@mail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="login-password">
            Password
          </label>
          <div className={styles.passwordWrapper}>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              className={styles.input}
              placeholder="******"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className={styles.forgotRow}>
          <Link href="/forgot-password" className={styles.forgotLink}>
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          className={styles.primaryButton}
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

      </form>
    </AuthLayout>
  );
}
