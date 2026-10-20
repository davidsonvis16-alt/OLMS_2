import type { SupabaseClient } from "@supabase/supabase-js";

export type Taken = "id_number" | "phone" | null;

/**
 * Whether an ID number or phone already belongs to another account (one account per person). Compared after removing
 * spaces and dashes, so "0712 345 678" matches "+254712345678". If the check itself can't run (database not yet
 * updated) it lets the save through and logs it; the unique indexes in schema.sql are the backstop.
 */
export async function identityTaken(db: SupabaseClient, userId: string, idNumber: string | null, phone: string | null): Promise<Taken> {
  if (!idNumber && !phone) return null;
  const { data, error } = await db.rpc("identity_taken", { p_user: userId, p_id_number: idNumber, p_phone: phone });
  if (error) { console.error("identity_taken check unavailable:", error.message); return null; }
  return (data as Taken) ?? null;
}

export const TAKEN_MESSAGE: Record<Exclude<Taken, null>, string> = {
  id_number: "That ID or passport number is already registered to another account. Each person can have one account. If this is a mistake, contact Aspire.",
  phone: "That phone number is already linked to another account. Each person can have one account. If this is a mistake, contact Aspire.",
};
