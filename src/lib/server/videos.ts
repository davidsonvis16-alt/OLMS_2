import { workerEnv } from "./request";

/** The Cloudflare R2 bucket that holds lesson videos uploaded by admins (binding VIDEOS in wrangler.jsonc). */
export function videoBucket(): R2Bucket | null {
  return (workerEnv() as Env & { VIDEOS?: R2Bucket }).VIDEOS ?? null;
}
