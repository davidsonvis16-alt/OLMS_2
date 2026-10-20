import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import { readFileSync } from "node:fs";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Public values (Supabase URL and anon key, site URL) are built into the pages; secrets stay in the Worker's env.
  // wrangler.jsonc holds the deployed values (so Cloudflare's builds have them); .env.local overrides them on this computer.
  const jsonc = readFileSync("wrangler.jsonc", "utf8").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  const vars: Record<string, string> = JSON.parse(jsonc).vars ?? {};
  const publicVars = Object.fromEntries(Object.entries(vars).filter(([k]) => k.startsWith("NEXT_PUBLIC_")));
  const env = { ...publicVars, ...loadEnv(mode, process.cwd(), "NEXT_PUBLIC_") };
  const define = Object.fromEntries(Object.entries(env).map(([k, v]) => [`process.env.${k}`, JSON.stringify(v)]));
  return {
    define,
    plugins: [cloudflare({ viteEnvironment: { name: "ssr" } }), reactRouter()],
    resolve: { tsconfigPaths: true },
    // Same address as before (Supabase's sign-in links and passkeys are set up for localhost:3000).
    server: { port: 3000 },
  };
});
