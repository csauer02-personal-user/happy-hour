import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}

/**
 * Universal sign out — clears both client and server sessions.
 * Call from any component, then redirect as needed.
 */
export async function signOut() {
  const supabase = createClient();
  // Clear client-side session
  await supabase.auth.signOut();
  // Clear server-side cookies
  await fetch("/api/auth/signout", { method: "POST", redirect: "manual" });
}
