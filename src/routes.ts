import { type RouteConfig, index, route } from "@react-router/dev/routes";

/** Every address on the site and the file that handles it. */
export default [
  index("app/page.tsx"),
  route("courses", "app/courses/page.tsx"),
  route("courses/:slug", "app/courses/[slug]/page.tsx"),
  route("accredited", "app/accredited/page.tsx"),
  route("consultancy", "app/consultancy/page.tsx"),
  route("business", "app/business/page.tsx"),
  route("verify", "app/verify/page.tsx"),
  route("verify/:serial", "app/verify/[serial]/page.tsx"),
  route("terms", "app/terms/page.tsx"),
  route("privacy", "app/privacy/page.tsx"),

  route("login", "app/login/page.tsx"),
  route("signup", "app/signup/page.tsx"),
  route("forgot", "app/forgot/page.tsx"),
  route("reset", "app/reset/page.tsx"),
  route("auth/callback", "app/auth/callback/route.ts"),
  route("auth/confirm", "app/auth/confirm/route.ts"),
  route("join/:code", "app/join/[code]/page.tsx"),

  route("dashboard", "app/dashboard/page.tsx"),
  route("account", "app/account/page.tsx"),
  route("certificates", "app/certificates/page.tsx"),
  route("company", "app/company/page.tsx"),
  route("learn/:slug", "app/learn/[slug]/page.tsx"),
  route("learn/:slug/m/:position", "app/learn/[slug]/m/[position]/page.tsx"),
  route("learn/:slug/exam", "app/learn/[slug]/exam/page.tsx"),
  route("learn/:slug/certificate", "app/learn/[slug]/certificate/page.tsx"),

  route("admin", "app/admin/page.tsx"),
  route("admin/courses", "app/admin/courses/page.tsx"),
  route("admin/courses/:id", "app/admin/courses/[id]/page.tsx"),
  route("admin/learners", "app/admin/learners/page.tsx"),
  route("admin/certificates", "app/admin/certificates/page.tsx"),
  route("admin/payments", "app/admin/payments/page.tsx"),
  route("admin/companies", "app/admin/companies/page.tsx"),
  route("admin/submissions", "app/admin/submissions/page.tsx"),

  route("api/learn", "app/api/learn/route.ts"),
  route("api/certificate/:serial", "app/api/certificate/[serial]/route.ts"),
  route("api/admin/slides", "app/api/admin/slides/route.ts"),
  route("api/pay/callback", "app/api/pay/callback/route.ts"),
  route("api/pay/webhook", "app/api/pay/webhook/route.ts"),
  // Form posts and in-page saves (what Next.js called server actions): see app/form-actions.ts.
  route("do/:name", "app/do.$name.ts"),
] satisfies RouteConfig;
