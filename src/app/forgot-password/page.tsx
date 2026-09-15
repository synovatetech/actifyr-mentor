'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/features/auth/AuthLayout';
import { authService } from '@/services/api/auth.service';
import { errorToast, successToast } from '@/utils/toast';
import styles from '@/styles/auth.module.css';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (value: string) => {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return 'Email is required.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedValue)) {
      return 'Please enter a valid email address.';
    }

    return '';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationError = validateEmail(email);
    if (validationError) {
      setEmailError(validationError);
      return;
    }

    setEmailError('');
    setLoading(true);

    try {
      const response = await authService.requestPasswordReset({ email: email.trim() });

      if (response.success) {
        const successMessage =
          response.data?.message ||
          response.data?.data?.message ||
          'Reset password link sent to your email.';
        successToast(successMessage);
        router.push('/login');
        return;
      }

      errorToast(response.error || 'Unable to send reset link. Please try again.');
    } catch (err) {
      errorToast('Unable to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout showBackToLogin>
      <h1 className={styles.title}>Forgot Password</h1>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="forgot-email">
            Enter Registered Email Address
          </label>
          <input
            id="forgot-email"
            type="email"
            className={styles.input}
            placeholder="abc@mail.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (emailError) {
                setEmailError('');
              }
            }}
            required
            disabled={loading}
            aria-invalid={Boolean(emailError)}
          />
          {emailError && <p className={styles.errorText}>{emailError}</p>}
        </div>

        <button type="submit" className={styles.primaryButton} disabled={loading}>
          {loading ? 'Sending...' : 'Reset Password'}
        </button>
      </form>
    </AuthLayout>
  );
}
