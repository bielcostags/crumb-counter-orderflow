import { createCookieAuthClient, AUTH_COOKIE } from "./cookie-client.server";
import { getCookies, setCookie, setResponseHeader } from "@tanstack/react-start/server";
import { authConfiguration } from "./config";

/** Request-scoped, server-only. No privileged key, browser storage or singleton session. */
export function createAuthServerClient() {
  const config = authConfiguration(process.env);
  setResponseHeader("Cache-Control", "private, no-store");
  setResponseHeader("Vary", "Cookie");
  return createCookieAuthClient(config, {
    getAll: () =>
      Object.entries(getCookies())
        .filter(([name]) => name.startsWith(AUTH_COOKIE))
        .map(([name, value]) => ({ name, value })),
    setAll: (cookies) => {
      for (const { name, value, options } of cookies)
        setCookie(name, value, {
          ...options,
          path: "/",
          httpOnly: true,
          secure: config.secure,
          sameSite: "lax",
        });
    },
  });
}
export function clearAuthCookies() {
  const config = authConfiguration(process.env);
  for (const name of Object.keys(getCookies()).filter((n) => n.startsWith(AUTH_COOKIE)))
    setCookie(name, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: config.secure,
      sameSite: "lax",
    });
}
