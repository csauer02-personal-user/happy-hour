"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [checkEmail, setCheckEmail] = useState("");

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const supabase = createClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const confirmPath = `/auth/confirm?next=${encodeURIComponent(next)}`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(confirmPath)}`,
      });
      if (resetError) {
        setError(resetError.message || "Failed to send reset email");
      } else {
        setIsForgotPassword(false);
        setSuccess("Reset link sent! Check your email, then sign in with your new password.");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const supabase = createClient();

      if (isSignUp) {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback?next=/login`,
          },
        });
        if (authError) {
          setError(authError.message || "Sign up failed");
        } else if (data.user && data.user.identities?.length === 0) {
          setError("An account with this email already exists. Try signing in instead.");
        } else {
          setCheckEmail(email);
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) {
          setError(authError.message || "Invalid credentials");
        } else {
          window.location.href = next;
        }
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center p-4">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-5 w-full max-w-md">
        {checkEmail ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">✉️</div>
            <h1 className="text-xl font-bold text-purple-800 mb-2">Check Your Email</h1>
            <p className="text-purple-600 text-sm mb-6">
              We just sent a verification link to<br />
              <span className="font-semibold text-purple-800">{checkEmail}</span>
            </p>
            <button
              type="button"
              onClick={() => { setCheckEmail(""); setIsSignUp(false); setEmail(""); setPassword(""); }}
              className="inline-flex items-center gap-2 py-3 px-6 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity min-h-[44px]"
            >
              Go to Login
              <span className="inline-block animate-bounce-x">→</span>
            </button>
          </div>
        ) : (
        <>
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">🦄</div>
          <h1 className="text-xl font-bold text-purple-800">
            {isForgotPassword
              ? "Reset Your Password"
              : isSignUp
                ? "Create an ATL Happy Hour Account"
                : "Log in to ATL Happy Hour"}
          </h1>
        </div>

        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="space-y-3">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-purple-700 mb-1">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-3 rounded-lg border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70 min-h-[44px]"
                placeholder="name@example.com"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            {success && (
              <p className="text-green-700 text-sm bg-green-50 rounded-lg px-3 py-2">{success}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {submitting ? "Sending reset link…" : "Send Reset Link"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3" autoComplete={isSignUp ? "off" : "on"} key={isSignUp ? "signup" : "signin"}>
            <div>
              <label
                htmlFor={isSignUp ? "new-email" : "login-email"}
                className="block text-sm font-medium text-purple-700 mb-1"
              >
                Email
              </label>
              <input
                key={isSignUp ? "new-email" : "login-email"}
                id={isSignUp ? "new-email" : "login-email"}
                name={isSignUp ? "email" : "username"}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete={isSignUp ? "email" : "username"}
                className="w-full px-3 py-3 rounded-lg border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70 min-h-[44px]"
                placeholder="name@example.com"
              />
            </div>

            <div>
              {!isSignUp && (
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="current-password" className="block text-sm font-medium text-purple-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(true); setError(""); setSuccess(""); }}
                    className="text-xs text-purple-600 hover:text-purple-800 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
              {isSignUp && (
                <label htmlFor="new-password" className="block text-sm font-medium text-purple-700 mb-1">
                  Password
                </label>
              )}
              <input
                key={isSignUp ? "new-password" : "current-password"}
                id={isSignUp ? "new-password" : "current-password"}
                name={isSignUp ? "new-password" : "password"}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isSignUp ? "new-password" : "current-password"}
                className="w-full px-3 py-3 rounded-lg border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70 min-h-[44px]"
                placeholder={isSignUp ? "Create a password" : "Enter your password"}
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            {success && (
              <p className="text-green-700 text-sm bg-green-50 rounded-lg px-3 py-2">{success}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {submitting
                ? isSignUp ? "Creating account…" : "Logging in…"
                : isSignUp ? "Create Account" : "Log In"}
            </button>
          </form>
        )}

        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setIsForgotPassword(false); setError(""); setSuccess(""); }}
            className="text-sm text-purple-600 hover:text-purple-800 transition-colors min-h-[44px] px-4"
          >
            {isSignUp || isForgotPassword
              ? "Already have an account? Log in"
              : "Don't have an account? Sign up"}
          </button>
        </div>

        <div className="mt-1 text-center">
          <Link
            href="/"
            className="text-sm text-purple-600 hover:text-purple-800 transition-colors inline-flex items-center min-h-[44px] px-4"
          >
            ← Back to Happy Hour
          </Link>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
