import { AuthError } from '@supabase/supabase-js';

export const getAuthErrorMessage = (error: AuthError): string => {
  const errorMessage = error.message.toLowerCase();

  // Sign up errors
  if (errorMessage.includes('user already registered')) {
    return 'This email is already registered. Please sign in instead.';
  }

  if (errorMessage.includes('email not confirmed')) {
    return 'Please check your email and confirm your account before signing in.';
  }

  // Sign in errors
  if (errorMessage.includes('invalid login credentials') || errorMessage.includes('invalid email or password')) {
    return 'Incorrect email or password. Please try again.';
  }

  if (errorMessage.includes('email not found')) {
    return 'No account found with this email. Please sign up first.';
  }

  // Password errors
  if (errorMessage.includes('password') && errorMessage.includes('weak')) {
    return 'Password is too weak. Please use at least 8 characters with uppercase, lowercase, and numbers.';
  }

  if (errorMessage.includes('password should be at least')) {
    return 'Password must be at least 8 characters long.';
  }

  // Rate limiting
  if (errorMessage.includes('too many requests') || errorMessage.includes('rate limit')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }

  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Connection issue. Please check your internet and try again.';
  }

  // Email verification
  if (errorMessage.includes('email link is invalid')) {
    return 'This verification link is invalid or has expired. Please request a new one.';
  }

  // Password reset
  if (errorMessage.includes('password reset')) {
    return 'Unable to send password reset email. Please try again.';
  }

  // Session errors
  if (errorMessage.includes('session') || errorMessage.includes('token')) {
    return 'Your session has expired. Please sign in again.';
  }

  // Generic fallback
  if (error.status === 400) {
    return 'Invalid request. Please check your information and try again.';
  }

  if (error.status === 422) {
    return 'Unable to process your request. Please check your input.';
  }

  if (error.status === 500) {
    return 'Server error. Please try again later.';
  }

  // Default fallback - keep it user-friendly
  return 'An unexpected error occurred. Please try again.';
};
