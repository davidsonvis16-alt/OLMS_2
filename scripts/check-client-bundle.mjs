// Builds nothing: run after `npm run build`. Fails if any file sent to browsers (build/client) contains a secret
// value from .env.local / .dev.vars, or the names of server-only secrets.
import fs from "node:fs";
import path from "node:path";

const env = {};
for (const f of [".env.local", ".dev.vars", ".env"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split("\n")) { const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
}
const secrets = Object.entries(env).filter(([k, v]) => !k.startsWith("NEXT_PUBLIC_") && v.length >= 8);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk("build/client").filter((f) => /\.(js|mjs|html|css|json|map)$/.test(f));
const problems = [];
for (const f of files) {
  const text = fs.readFileSync(f, "utf8");
  for (const [k, v] of secrets) if (text.includes(v)) problems.push(`${f}: contains the value of ${k}`);
  for (const name of ["SUPABASE_SERVICE_ROLE_KEY", "PAYSTACK_SECRET_KEY", "node:async_hooks", "supabaseAdmin"]) if (text.includes(name)) problems.push(`${f}: mentions ${name}`);
}
console.log(`Checked ${files.length} browser files against ${secrets.length} secret values.`);
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log("No secrets or server-only code in the browser bundle.");
