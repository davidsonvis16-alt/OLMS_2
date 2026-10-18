/** Only https embeds from these players may be placed in an iframe. */
const HOSTS = new Set(["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "player.vimeo.com", "iframe.mediadelivery.net"]);

export function safeVideoUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" || !HOSTS.has(u.hostname) || u.username || u.password) return null;
    return u.toString();
  } catch {
    return null;
  }
}
