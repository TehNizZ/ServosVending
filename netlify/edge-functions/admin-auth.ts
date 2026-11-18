// Password-protects /admin with HTTP Basic Auth, enforced on Netlify's servers
// before any admin file is sent. Credentials live in Netlify environment
// variables (ADMIN_USER, ADMIN_PASS), never in the repo or the page source.
import type { Config, Context } from "@netlify/edge-functions";

const enc = new TextEncoder();

// Constant-time comparison (hash both sides so lengths never leak).
async function safeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(ha), y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export default async (request: Request, context: Context) => {
  const user = Netlify.env.get("ADMIN_USER");
  const pass = Netlify.env.get("ADMIN_PASS");

  // Fail closed: if credentials were never set, nobody gets in.
  if (!user || !pass) {
    return new Response("Admin is locked: credentials are not configured.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = new TextDecoder().decode(
        Uint8Array.from(atob(header.slice(6)), (c) => c.charCodeAt(0)),
      );
      const i = decoded.indexOf(":");
      if (i > -1) {
        const okUser = await safeEqual(decoded.slice(0, i), user);
        const okPass = await safeEqual(decoded.slice(i + 1), pass);
        if (okUser && okPass) {
          const res = await context.next();
          res.headers.set("Cache-Control", "private, no-store");
          return res;
        }
      }
    } catch (_) { /* malformed header: fall through to 401 */ }
  }

  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Servos Admin", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
};

export const config: Config = { path: ["/admin", "/admin/*"] };
