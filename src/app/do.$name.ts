import type { ActionFunctionArgs } from "react-router";
import * as user from "./actions";
import * as admin from "./admin/actions";
import * as pay from "./pay-actions";
import * as company from "./company-actions";
import { certificatePreview } from "./cert-preview";
import { safeNext } from "@/lib/safe-next";
import { redirect } from "@/lib/server/http";

/**
 * Every form on the site posts here (POST /do/<name>), the way Next.js server actions worked. Only the names listed
 * are callable, and each one checks who is signed in and what they may do. The Worker has already refused posts from
 * other sites. Plain form posts end in a redirect; in-page calls (fetch with Accept: application/json) get JSON.
 */
const ACTIONS: Record<string, (f: FormData) => Promise<unknown>> = {
  enrol: user.enrol,
  signOut: () => user.signOut(),
  updateProfile: user.updateProfile,
  saveDetails: (f) => user.saveDetails({}, f),
  saveAssignment: user.saveAssignment,
  claimCertificate: pay.claimCertificate,
  certificatePreview: (f) => certificatePreview(String(f.get("slug") ?? ""), String(f.get("full_name") ?? ""), String(f.get("id_number") ?? "")),
  createCompany: company.createCompany,
  buySeats: company.buySeats,
  removeMember: company.removeMember,
  joinCompany: company.joinCompany,
  createCourse: admin.createCourse,
  saveCourse: admin.saveCourse,
  deleteCourse: admin.deleteCourse,
  setSlides: (f) => admin.setSlides(String(f.get("course") ?? ""), Number(f.get("version")), Number(f.get("count"))),
  saveModule: admin.saveModule,
  deleteModule: admin.deleteModule,
  saveQuestion: admin.saveQuestion,
  deleteQuestion: admin.deleteQuestion,
  saveSettings: admin.saveSettings,
  setRevoked: admin.setRevoked,
  setRole: admin.setRole,
  adjustCompany: admin.adjustCompany,
  deleteCompany: admin.deleteCompany,
  suspendUser: admin.suspendUser,
  restoreUser: admin.restoreUser,
  deleteUser: admin.deleteUser,
};

export async function action({ request, params }: ActionFunctionArgs) {
  const run = Object.hasOwn(ACTIONS, params.name ?? "") ? ACTIONS[params.name!] : null;
  if (!run) return new Response("Not found", { status: 404 });
  const result = await run(await request.formData()); // redirects are thrown Responses and pass straight through
  if ((request.headers.get("accept") ?? "").includes("application/json")) return Response.json(result ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
  // A plain form that saved without choosing where to go: back to the page it came from.
  let back = "/";
  try { const r = new URL(request.headers.get("referer") ?? "", request.url); if (r.origin === new URL(request.url).origin) back = r.pathname + r.search; } catch { /* no referer */ }
  redirect(safeNext(back, "/"));
}

export function loader() {
  return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
}
