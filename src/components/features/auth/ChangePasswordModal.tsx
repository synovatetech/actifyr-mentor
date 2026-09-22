"use client";

import { useState } from "react";
import { AuthLayout } from "@/components/features/auth/AuthLayout";
import { authService } from "@/services/api/auth.service";
import { errorToast, successToast } from "@/utils/toast";
import styles from "@/styles/auth.module.css";

const PASSWORD_POLICY_REGEX =
  /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const EyeIcon = ({ crossedOut }: { crossedOut: boolean }) =>
  crossedOut ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );

interface ChangePasswordModalProps {
  // Passed in when the caller already knows it (the login form) so the
  // mentor isn't asked to retype a password they just typed. When omitted
  // (AuthGuard's fallback gate on direct navigation with an already-valid
  // session, where no plaintext password is available), the field is shown.
  currentPassword?: string;
  // Called after a successful password change so the caller can re-verify
  // (AuthGuard re-fetches /mentor/me) before revealing the app.
  onDone: () => void;
}

// Mandatory gate — shown by the login page as soon as the login response
// reports password_changed: false, and by AuthGuard for any other path that
// reaches the app with that still unset. It can't be skipped into the app;
// the close button only logs the mentor out back to /login.
export default function ChangePasswordModal({
  currentPassword: knownCurrentPassword,
  onDone,
}: ChangePasswordModalProps) {
  const needsCurrentPasswordInput = !knownCurrentPassword;
  const [currentPassword, setCurrentPassword] = useState(knownCurrentPassword ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);

  const handleClose = async () => {
    if (closing || loading) return;
    setClosing(true);
    await authService.logout();
  };

  const validateNewPassword = (value: string) => {
    if (!value) {
      return "New password is required.";
    }
    if (!PASSWORD_POLICY_REGEX.test(value)) {
      return "Password must be at least 8 characters and include one uppercase letter, one lowercase letter, one number, and one special character.";
    }
    return "";
  };

  const validateConfirmPassword = (password: string, confirm: string) => {
    if (!confirm) {
      return "Confirm password is required.";
    }
    if (password !== confirm) {
      return "Passwords do not match.";
    }
    return "";
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const currentError =
      needsCurrentPasswordInput && !currentPassword ? "Current password is required." : "";
    const newError = validateNewPassword(newPassword);
    const confirmError = validateConfirmPassword(newPassword, confirmPassword);

    setCurrentPasswordError(currentError);
    setNewPasswordError(newError);
    setConfirmPasswordError(confirmError);

    if (currentError || newError || confirmError) {
      return;
    }

    setLoading(true);
    try {
      const response = await authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (response.success) {
        successToast("Password updated.");
        onDone();
        return;
      }

      errorToast(response.error || "Unable to update password. Please try again.");
    } catch {
      errorToast("Unable to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <button
        type="button"
        className={styles.closeButton}
        onClick={handleClose}
        disabled={loading || closing}
        aria-label="Close and return to login"
      >
        <CloseIcon />
      </button>
      <h1 className={styles.title}>Set New Password</h1>
      <p className={styles.hint} style={{ margin: "0 0 18px 0" }}>
        You&apos;re signed in with the temporary password that was emailed to
        you. You need to set a password only you know before you can continue.
      </p>

      <form onSubmit={handleSubmit}>
        {needsCurrentPasswordInput && (
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="current-password">
              Current Password
            </label>
            <div className={styles.passwordWrapper}>
              <input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                className={styles.input}
                placeholder="******"
                value={currentPassword}
                onChange={(event) => {
                  setCurrentPassword(event.target.value);
                  if (currentPasswordError) setCurrentPasswordError("");
                }}
                required
                disabled={loading}
                aria-invalid={Boolean(currentPasswordError)}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                disabled={loading}
              >
                <EyeIcon crossedOut={showCurrentPassword} />
              </button>
            </div>
            {currentPasswordError && <p className={styles.errorText}>{currentPasswordError}</p>}
          </div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="new-password">
            New Password
          </label>
          <div className={styles.passwordWrapper}>
            <input
              id="new-password"
              type={showNewPassword ? "text" : "password"}
              className={styles.input}
              placeholder="******"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                if (newPasswordError) setNewPasswordError("");
              }}
              required
              disabled={loading}
              aria-invalid={Boolean(newPasswordError)}
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowNewPassword(!showNewPassword)}
              aria-label={showNewPassword ? "Hide password" : "Show password"}
              disabled={loading}
            >
              <EyeIcon crossedOut={showNewPassword} />
            </button>
          </div>
          {newPasswordError && <p className={styles.errorText}>{newPasswordError}</p>}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="confirm-password">
            Confirm Password
          </label>
          <div className={styles.passwordWrapper}>
            <input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              className={styles.input}
              placeholder="******"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                if (confirmPasswordError) setConfirmPasswordError("");
              }}
              required
              disabled={loading}
              aria-invalid={Boolean(confirmPasswordError)}
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              disabled={loading}
            >
              <EyeIcon crossedOut={showConfirmPassword} />
            </button>
          </div>
          {confirmPasswordError && <p className={styles.errorText}>{confirmPasswordError}</p>}
        </div>

        <p className={styles.hint}>
          Password must be at least 8 characters and must include one
          uppercase letter, one lowercase letter, one number, and one special
          character
        </p>

        <button type="submit" className={styles.primaryButton} disabled={loading}>
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </AuthLayout>
  );
}
