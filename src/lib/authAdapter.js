// Auth adapter: one API for both modes.
// LOCAL MODE (Supabase set in env) → Supabase Auth.
// HOSTED MODE (no Supabase env) → Base44 Auth, exactly as before.

import { base44 } from "@/api/base44Client";
import { supabase, isLocalMode } from "@/lib/supabaseClient";

export async function signIn(email, password) {
  if (isLocalMode()) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return;
  }
  await base44.auth.loginViaEmailPassword(email, password);
}

// Returns { needsOtp, session }:
//  - hosted: always { needsOtp: true, session: false } (register → OTP flow)
//  - local:   { needsOtp: false, session: true } if sign-up logged the user in
//             (email confirmation off), else { needsOtp: false, session: false }
export async function signUp(email, password) {
  if (isLocalMode()) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/login" },
    });
    if (error) throw new Error(error.message);
    return { needsOtp: false, session: !!data.session };
  }
  await base44.auth.register({ email, password });
  return { needsOtp: true, session: false };
}

export async function verifyOtp(email, otpCode) {
  if (isLocalMode()) throw new Error("Not available in local mode");
  const result = await base44.auth.verifyOtp({ email, otpCode });
  return result;
}

export async function resendOtp(email) {
  if (isLocalMode()) throw new Error("Not available in local mode");
  await base44.auth.resendOtp(email);
}

export async function requestPasswordReset(email) {
  if (isLocalMode()) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (error) throw error;
    return;
  }
  await base44.auth.resetPasswordRequest(email);
}

export async function updatePassword({ resetToken, newPassword }) {
  if (isLocalMode()) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return;
  }
  await base44.auth.resetPassword({ resetToken, newPassword });
}

export async function googleLogin(returnTo) {
  if (isLocalMode()) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + (returnTo || "/") },
    });
    if (error) throw new Error(error.message);
    return;
  }
  base44.auth.loginWithProvider("google", returnTo);
}

export function setToken(token) {
  if (isLocalMode()) return;
  base44.auth.setToken(token);
}

export async function signOutLocal() {
  if (isLocalMode()) await supabase.auth.signOut();
}