import { beforeEach, describe, expect, it } from "vitest";
import { signIn } from "../support/setup";
import { USERS, stableId, stored } from "../support/fake-supabase";
import { POST } from "@/app/api/admin/slides/route";

const COURSE = stableId("haccp-principles");
const webp = () => { const b = new Uint8Array(64); b.set([82, 73, 70, 70], 0); b.set([87, 69, 66, 80], 8); return b; };
const up = (files: Record<string, Uint8Array>, fields: Record<string, string> = { course: COURSE, version: "2" }) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  for (const [k, v] of Object.entries(files)) fd.set(k, new Blob([v]), `${k}.webp`);
  return POST(new Request("https://aspire.test/api/admin/slides", { method: "POST", body: fd }));
};

describe("slide uploads", () => {
  beforeEach(() => { stored.length = 0; });

  it("reject anyone who isn't a signed-in admin", async () => {
    signIn(null); expect((await up({ p1: webp() })).status).toBe(401);
    for (const u of [USERS.learner, USERS.owner, USERS.member]) { signIn(u); expect((await up({ p1: webp() })).status).toBe(403); }
    expect(stored).toHaveLength(0);
  });

  it("reject files that aren't WebP images, bad slide details, oversized batches and unknown courses", async () => {
    signIn(USERS.admin);
    expect((await up({ p1: new TextEncoder().encode("<script>alert(1)</script>") })).status).toBe(400);
    expect((await up({ p1: webp() }, { course: "../../etc", version: "2" })).status).toBe(400);
    expect((await up({ p1: webp() }, { course: COURSE, version: "0" })).status).toBe(400);
    expect((await up({ p0: webp() })).status).toBe(400);
    expect((await up(Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`p${i + 1}`, webp()])))).status).toBe(400);
    expect((await up({ p1: webp() }, { course: stableId("no-such-course"), version: "2" })).status).toBe(404);
    expect(stored).toHaveLength(0);
  });

  it("store a batch of an admin's slides at the right places", async () => {
    signIn(USERS.admin);
    const res = await up({ p7: webp(), p8: webp(), p9: webp() });
    expect(res.status).toBe(200);
    expect(stored.map((x) => x.path).sort()).toEqual([`${COURSE}/v2/007.webp`, `${COURSE}/v2/008.webp`, `${COURSE}/v2/009.webp`]);
    expect(stored.every((x) => x.bucket === "slides" && x.upsert === true)).toBe(true);
  });
});
