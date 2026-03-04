"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function AuthConfirmPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Listen for auth events — PASSWORD_RECOVERY fires when a recovery
    // session is established (either via code exchange or hash tokens)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          setReady(true);
        }
      }
    );

    // Try exchanging a PKCE code from the URL query params
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error: codeError }) => {
        if (codeError) {
          setError("Invalid or expired link. Please request a new one.");
        }
        // onAuthStateChange will fire and set ready
      });
      return () => subscription.unsubscribe();
    }

    // Try hash fragments (legacy implicit flow / invite links)
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.slice(1));
      const type = params.get("type");
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if ((type === "invite" || type === "recovery") && accessToken) {
        supabase.auth
          .setSession({ access_token: accessToken, refresh_token: refreshToken ?? "" })
          .then(({ error: sessionError }) => {
            if (sessionError) {
              setError("Invalid or expired link. Please request a new one.");
            }
            // onAuthStateChange will fire and set ready
          });
        return () => subscription.unsubscribe();
      }
    }

    // Check for existing session (redirected from /auth/callback)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setReady(true);
      } else {
        setError("Invalid or expired link. Please request a new one.");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
      } else {
        router.push("/deal-updater");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex-1 bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">🦄</div>
          {error ? (
            <p className="text-red-600 text-sm">{error}</p>
          ) : (
            <p className="text-purple-700">Verifying your link…</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center p-4">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🦄</div>
          <h1 className="text-2xl font-bold text-purple-800">Set Your Password</h1>
          <p className="text-purple-600 text-sm mt-1">Welcome to ATL Happy Hour</p>
        </div>

        <form onSubmit={handleSetPassword} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-purple-700 mb-1"
            >
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-4 py-2.5 rounded-xl border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70"
              placeholder="Min 8 characters"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-purple-700 mb-1"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-4 py-2.5 rounded-xl border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70"
              placeholder="Repeat password"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Setting password…" : "Set Password & Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
