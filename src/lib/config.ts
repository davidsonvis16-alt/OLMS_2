/** No imports, so middleware (edge runtime) can use it too. */
export function supabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Admin accounts that can also study like a learner (My learning, courses, certificates). Add or remove emails here. */
const ADMIN_LEARNERS = ["davidson.vis.16@gmail.com", "mathatimuchiri@gmail.com"];

export function canLearn(profile: { role?: string | null; email?: string | null } | null | undefined) {
  if (!profile) return false;
  return profile.role !== "admin" || ADMIN_LEARNERS.includes((profile.email ?? "").toLowerCase());
}
