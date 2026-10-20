/** Public address of one slide image (the slides bucket is public; no keys involved, so pages can use it too). */
export function slideUrl(courseId: string, version: number, page: number) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/slides/${courseId}/v${version}/${String(page).padStart(3, "0")}.webp`;
}
