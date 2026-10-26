/** Only https embeds from these players may be placed in an iframe. */
const HOSTS = new Set(["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "player.vimeo.com", "iframe.mediadelivery.net"]);
const YT_ID = /^[A-Za-z0-9_-]{6,20}$/;

/**
 * Turns the link people copy from YouTube (watch?v=…, youtu.be/…, shorts/…) or Vimeo (vimeo.com/123) into the
 * player's embed address, so admins can paste the normal share link. Anything else is checked as an embed address.
 */
export function safeVideoUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" || u.username || u.password) return null;
    const host = u.hostname.replace(/^(www\.|m\.)/, "");
    const yt = (id: string | null) => (id && YT_ID.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null);
    if (host === "youtu.be") return yt(u.pathname.slice(1));
    if (host === "youtube.com") {
      if (u.pathname === "/watch") return yt(u.searchParams.get("v"));
      const m = /^\/(?:shorts|live)\/([^/]+)$/.exec(u.pathname);
      if (m) return yt(m[1]);
    }
    if (host === "vimeo.com" && /^\/\d+$/.test(u.pathname)) return `https://player.vimeo.com/video${u.pathname}`;
    if (!HOSTS.has(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}
