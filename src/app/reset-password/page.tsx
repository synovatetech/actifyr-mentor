'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/components/features/auth/AuthLayout';
import { authService } from '@/services/api/auth.service';
import { errorToast, successToast } from '@/utils/toast';
import styles from '@/styles/auth.module.css';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token')?.trim() || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePassword = (value: string) => {
    if (!value) {
      return 'New password is required.';
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(value)) {
      return 'Password must be at least 8 characters and include one uppercase letter, one number, and one special character.';
    }

    return '';
  };

  const validateConfirmPassword = (password: string, confirm: string) => {
    if (!confirm) {
      return 'Confirm password is required.';
    }

    if (password !== confirm) {
      return 'Passwords do not match.';
    }

    return '';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token) {
      errorToast('Reset token is missing or invalid. Please use the latest reset password link.');
      return;
    }

    const passwordValidationError = validatePassword(newPassword);
    const confirmValidationError = validateConfirmPassword(newPassword, confirmPassword);

    setNewPasswordError(passwordValidationError);
    setConfirmPasswordError(confirmValidationError);

    if (passwordValidationError || confirmValidationError) {
      return;
    }

    setLoading(true);

    try {
      const response = await authService.resetPassword({
        token,
        new_password: newPassword,
      });

      if (response.success) {
        const successMessage =
          response.data?.message ||
          response.data?.data?.message ||
          'Password reset successful. Please login with your new password.';
        successToast(successMessage);
        router.push('/login');
        return;
      }

      errorToast(response.error || 'Unable to reset password. Please try again.');
    } catch (err) {
      errorToast('Unable to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className={styles.title}>Reset Password</h1>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="new-password">
            Enter New Password
          </label>
          <div className={styles.passwordWrapper}>
            <input
              id="new-password"
              type={showNewPassword ? 'text' : 'password'}
              className={styles.input}
              placeholder="******"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                if (newPasswordError) {
                  setNewPasswordError('');
                }
              }}
              required
              disabled={loading}
              aria-invalid={Boolean(newPasswordError)}
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowNewPassword(!showNewPassword)}
              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              disabled={loading}
            >
              {showNewPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
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
              type={showConfirmPassword ? 'text' : 'password'}
              className={styles.input}
              placeholder="******"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                if (confirmPasswordError) {
                  setConfirmPasswordError('');
                }
              }}
              required
              disabled={loading}
              aria-invalid={Boolean(confirmPasswordError)}
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              disabled={loading}
            >
              {showConfirmPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>
          {confirmPasswordError && <p className={styles.errorText}>{confirmPasswordError}</p>}
        </div>

        <p className={styles.hint}>
          Password must be at least 8 characters and must include one uppercase
          letter, one number, and one special character
        </p>

        <button type="submit" className={styles.primaryButton} disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Password'}
        </button>
      </form>
    </AuthLayout>
  );
}
