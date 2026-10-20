// Loads the 8 Aspire courses (modules + question banks) into Supabase.
// Usage: put your keys in .env.local, then `npm run seed`. Safe to re-run: existing courses (by slug) are skipped.
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });
const courses = JSON.parse(readFileSync(new URL("../content/courses.json", import.meta.url), "utf8"));

let sort = 0;
for (const c of courses) {
  sort++;
  const { data: exists } = await db.from("courses").select("id").eq("slug", c.slug).maybeSingle();
  if (exists) { console.log(`• ${c.title}: already there, skipped`); continue; }
  const { data: course, error } = await db.from("courses").insert({
    slug: c.slug, title: c.title, category: c.category, categories: c.categories, summary: c.summary, topics: c.topics,
    assignment: c.assignment, published: false, sort,
  }).select("id").single();
  if (error) { console.error(c.title, error.message); continue; }
  let qpos = 0, flagged = 0;
  for (const [i, m] of c.modules.entries()) {
    const { data: mod, error: me } = await db.from("modules").insert({
      course_id: course.id, position: i + 1, title: m.title, page_from: m.pages[0], page_to: m.pages[1], extra_pages: m.extra_pages ?? [],
    }).select("id").single();
    if (me) { console.error(m.title, me.message); continue; }
    const rows = m.quiz.map((q) => {
      if (q.review) flagged++;
      return { course_id: course.id, module_id: mod.id, position: ++qpos, prompt: q.prompt, options: q.options, answer: q.answer, source: q.source, review_note: q.review ?? null };
    });
    const { error: qe } = await db.from("questions").insert(rows);
    if (qe) console.error(m.title, qe.message);
  }
  console.log(`✓ ${c.title}: ${c.modules.length} modules, ${qpos} questions${flagged ? `, ${flagged} flagged for review` : ""}`);
}

if (process.env.ADMIN_EMAIL) {
  // ADMIN_EMAIL may list several addresses, separated by commas.
  // Promote by the sign-in account (auth.users), matched exactly and only once the email is confirmed.
  // Never by profiles.email: that column is a copy and must not decide who becomes an admin.
  const wanted = process.env.ADMIN_EMAIL.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const users = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) { console.error(error.message); break; }
    users.push(...data.users);
    if (data.users.length < 200) break;
  }
  for (const want of wanted) {
    const found = users.find((u) => (u.email ?? "").toLowerCase() === want);
    if (!found) console.log(`! ${want} hasn't signed up yet. Sign up on the site, confirm the email, then run \`npm run seed\` again.`);
    else if (!found.email_confirmed_at) console.log(`! ${found.email} has not confirmed their email yet. Confirm it, then run \`npm run seed\` again.`);
    else {
      const { error } = await db.from("profiles").update({ role: "admin" }).eq("id", found.id);
      console.log(error ? error.message : `✓ ${found.email} is now an admin`);
    }
  }
}
console.log("\nNext: sign in as admin › Admin › Courses › upload each deck as a PDF › tick Published.");
