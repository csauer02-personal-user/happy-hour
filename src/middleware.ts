import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { pathname, searchParams } = request.nextUrl;

  // Intercept PKCE auth codes that land on the wrong route.
  // Supabase ignores redirectTo if the URL isn't in the dashboard allowlist,
  // falling back to the Site URL (/).  Catch those codes and route them
  // through /auth/callback so the exchange still works.
  const code = searchParams.get("code");
  if (code && !pathname.startsWith("/auth/callback")) {
    const callbackUrl = new URL("/auth/callback", request.url);
    callbackUrl.searchParams.set("code", code);
    callbackUrl.searchParams.set("next", "/auth/confirm");
    return NextResponse.redirect(callbackUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /deal-updater/* — requires authenticated user
  if (pathname.startsWith("/deal-updater")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect /admin/* — requires authenticated user with role=admin
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Protect API routes that require auth
  if (
    pathname === "/api/extract-deal" ||
    pathname === "/api/enhance-deal"
  ) {
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
