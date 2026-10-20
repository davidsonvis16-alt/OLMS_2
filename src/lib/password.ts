/** Password rules and generator. Runs in the browser (sign-up, reset) and in tests. */

export const MIN_LENGTH = 12;

export type Rule = { id: string; label: string; ok: boolean };

export function checkPassword(pw: string, context: { email?: string; name?: string } = {}): { rules: Rule[]; valid: boolean } {
  const lower = pw.toLowerCase();
  const personal = [context.email?.split("@")[0], ...(context.name ?? "").split(/\s+/)]
    .map((x) => (x ?? "").toLowerCase()).filter((x) => x.length >= 3);
  const rules: Rule[] = [
    { id: "length", label: `At least ${MIN_LENGTH} characters`, ok: pw.length >= MIN_LENGTH },
    { id: "upper", label: "An UPPERCASE letter", ok: /[A-Z]/.test(pw) },
    { id: "lower", label: "A lowercase letter", ok: /[a-z]/.test(pw) },
    { id: "digit", label: "A number", ok: /[0-9]/.test(pw) },
    { id: "symbol", label: "A symbol, such as ! ? # @ . -", ok: /[^A-Za-z0-9]/.test(pw) },
    { id: "repeat", label: "No character three times in a row (aaa, 111)", ok: pw.length > 0 && !/(.)\1\1/.test(pw) },
    { id: "personal", label: "Doesn't contain your name or email", ok: pw.length > 0 && !personal.some((p) => lower.includes(p)) },
  ];
  return { rules, valid: rules.every((r) => r.ok) };
}

const SETS = {
  upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  lower: "abcdefghijkmnopqrstuvwxyz",
  digit: "23456789",
  symbol: "!#$%&*+-.?@_~",
};

/** An unbiased random index in [0, n) from the platform's cryptographic random source. */
function randomIndex(n: number) {
  const max = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(buf);
    if (buf[0] < max) return buf[0] % n;
  }
}

/** A fresh random password: every character class present, look-alike characters (0/O, 1/l/I) left out. */
export function generatePassword(length = 18): string {
  const all = Object.values(SETS).join("");
  for (;;) {
    const chars = Object.values(SETS).map((s) => s[randomIndex(s.length)]);
    while (chars.length < length) chars.push(all[randomIndex(all.length)]);
    for (let i = chars.length - 1; i > 0; i--) { const j = randomIndex(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
    const pw = chars.join("");
    if (checkPassword(pw).valid) return pw;
  }
}
