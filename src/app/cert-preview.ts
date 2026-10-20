import { requireUser } from "@/lib/auth";
import { courseState } from "@/lib/learning";
import { limit } from "@/lib/rate-limit";
import { certificateModel, type CertModel } from "@/lib/certificate-model";

const SAMPLE = "ASH-XXXX-XXXXXX";
export type Preview = CertModel;
/**
 * Lays out the learner's certificate with the name and ID they are typing (stamped SAMPLE, no real serial), using the
 * same fonts and measurements as the issued PDF. Only for a course the signed-in learner has passed.
 */
export async function certificatePreview(slug: string, fullName: string, idNumber: string): Promise<Preview | null> {
  const { user } = await requireUser(`/learn/${slug}/certificate`);
  if (typeof slug !== "string" || !/^[a-z0-9-]{1,100}$/.test(slug)) return null;
  if (!(await limit("preview", user.id))) return null;
  const s = await courseState(user.id, slug);
  if (!s?.passed) return null;
  const name = String(fullName ?? "").replace(/\s+/g, " ").trim().slice(0, 120) || "Your Full Name";
  const id = String(idNumber ?? "").trim().slice(0, 40) || "Your ID number";
  return certificateModel({
    serial: SAMPLE, fullName: name, idNumber: id, course: s.course.title, modules: s.modules.map((m) => m.title),
    score: s.bestScore ?? 0, issuedAt: new Date(), sample: true,
  });
}
