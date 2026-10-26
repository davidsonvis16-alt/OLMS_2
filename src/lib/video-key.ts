/** Where an uploaded lesson video is stored in R2, and the site address it plays from (/media/<key>). */
export const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
export const VIDEO_KEY = /^videos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[a-z0-9]{16}\.(mp4|webm|mov)$/;
export const MEDIA_PATH = /^\/media\/(videos\/[0-9a-f-]{36}\/[a-z0-9]{16}\.(mp4|webm|mov))$/;
export const keyFromMedia = (url: string | null | undefined) => (url ? MEDIA_PATH.exec(url)?.[1] ?? null : null);
