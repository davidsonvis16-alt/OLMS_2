import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useRouteError, type LinksFunction, type LoaderFunctionArgs, type MetaFunction, type MiddlewareFunction } from "react-router";
import styles from "./app/globals.css?url";
import fonts from "./fonts.css?url";
import { getSession } from "@/lib/auth";
import { canLearn } from "@/lib/config";
import { isGated } from "@/lib/server/security";
import { supabaseServer } from "@/lib/supabase";
import { SITE } from "@/lib/site";
import type { Viewer } from "@/lib/viewer";

export const links: LinksFunction = () => [
  { rel: "preload", href: "/fonts/archivo-normal-100-900.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: fonts },
  { rel: "stylesheet", href: styles },
  { rel: "icon", href: "/brand/logo-light.png" },
];

export const meta: MetaFunction = () => [
  { title: `${SITE.name} | ${SITE.tagline}` },
  { name: "description", content: "Online food safety, hygiene and workplace health & safety training for the hospitality and food industry. Learn free, pass the assessment and earn a verifiable Aspire certificate." },
  { property: "og:title", content: SITE.name },
  { property: "og:description", content: SITE.tagline },
  { property: "og:image", content: "/brand/logo-light.png" },
  { name: "theme-color", content: "#0b0b1f" },
];

/**
 * Runs before every page: refreshes the Supabase sign-in (getUser checks the token with Supabase Auth) and sends
 * signed-out visitors away from private pages. Each page and action still checks for itself.
 */
export const middleware: MiddlewareFunction<Response>[] = [
  async ({ request }) => {
    const path = new URL(request.url).pathname.replace(/\.data$/, "").replace(/^\/_root$/, "/");
    const { data: { user } } = await (await supabaseServer()).auth.getUser();
    if (isGated(path) && !user) {
      const u = new URL(request.url);
      throw new Response(null, { status: 303, headers: { Location: `/login?next=${encodeURIComponent(path + u.search)}` } });
    }
  },
];

/** Who is signed in, for the header and the workspace menu. */
export async function loader(_: LoaderFunctionArgs) {
  const { profile } = await getSession();
  const viewer: Viewer = profile ? { name: profile.full_name, email: profile.email, role: profile.role, companyRole: profile.company_role, canLearn: canLearn(profile) } : null;
  return { viewer };
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        {/* Stylesheets need no CSP nonce (style-src allows the site's own files); leaving it off keeps hydration quiet. */}
        <Links nonce="" />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  const missing = isRouteErrorResponse(error) && error.status === 404;
  if (!missing) console.error(error);
  return (
    <main id="main" className="wrap" style={{ padding: "clamp(64px, 12vw, 160px) var(--gut)", maxWidth: 760 }}>
      <span className="nh-eyebrow">{missing ? "404" : "Something went wrong"}</span>
      <h1 className="h-l">{missing ? "That page isn't here." : "Sorry, that didn't work."}</h1>
      <p className="lede" style={{ marginTop: 18 }}>{missing ? "The link may be old, or the page may have moved." : "Please try again in a moment. If it keeps happening, message us on WhatsApp."}</p>
      <p style={{ marginTop: 28 }}><a className="btn btn--go" href="/">Go to the home page</a></p>
    </main>
  );
}
