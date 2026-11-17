import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
export const AUTH_COOKIE = "vr-staff-auth";
export function createCookieAuthClient(
  config: { url: string; key: string; secure: boolean },
  cookies: CookieMethodsServer,
) {
  return createServerClient(config.url, config.key, {
    cookieOptions: {
      name: AUTH_COOKIE,
      path: "/",
      httpOnly: true,
      secure: config.secure,
      sameSite: "lax",
    },
    cookies,
  });
}
