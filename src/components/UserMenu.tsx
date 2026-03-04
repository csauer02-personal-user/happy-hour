"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient, signOut } from "@/lib/supabase-browser";

export default function UserMenu() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? null);
        const { data: profile } = await supabase
          .from("profiles").select("role").eq("id", user.id).single();
        setIsAdmin(profile?.role === "admin");
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUserEmail(session.user.email ?? null);
          const { data: profile } = await supabase
            .from("profiles").select("role").eq("id", session.user.id).single();
          setIsAdmin(profile?.role === "admin");
        } else {
          setUserEmail(null);
          setIsAdmin(false);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    router.push("/");
    router.refresh();
  };

  if (!userEmail) {
    return (
      <Link
        href="/login"
        className="flex items-center justify-center w-8 h-8 rounded-full text-white/80 hover:bg-white/20 transition-colors"
        aria-label="Sign in"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-8 h-8 rounded-full text-white/80 hover:bg-white/20 transition-colors"
        aria-label="Account menu"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
          <div className="px-3 py-1.5 border-b border-gray-100">
            <p className="text-[10px] text-gray-400 truncate">{userEmail}</p>
          </div>
          {isAdmin && (
            <Link href="/admin" onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Admin
            </Link>
          )}
          <button onClick={handleSignOut}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
