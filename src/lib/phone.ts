import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";

/** Phone helpers shared by the browser (sign-up form) and the server (profile saves). */
export const COUNTRY_CODES = new Set<string>(getCountries());
export const isCountry = (c: string | null | undefined): c is CountryCode => !!c && COUNTRY_CODES.has(c.toUpperCase());
export const dial = (c: string) => getCountryCallingCode(c as CountryCode);

let names: Intl.DisplayNames | null = null;
export function countryName(c: string) {
  try { names ??= new Intl.DisplayNames(["en"], { type: "region" }); return names.of(c) ?? c; } catch { return c; }
}

/** Splits a saved number (+254712…) into its country and the number as people type it locally. */
export function splitPhone(saved: string | null | undefined): { iso: CountryCode | null; local: string } {
  const n = saved ? parsePhoneNumberFromString(saved) : undefined;
  return n?.country ? { iso: n.country, local: n.formatNational() } : { iso: null, local: saved ?? "" };
}

/** Builds the full international number (+254…) from the chosen country and what was typed. Throws a plain message if it isn't valid. */
export function readPhone(f: FormData): { phone: string; country: string } {
  const iso = String(f.get("phone_country") ?? "");
  const local = String(f.get("phone_local") ?? "").trim().slice(0, 40);
  const country = isCountry(iso) ? countryName(iso) : "";
  if (!local) return { phone: "", country };
  const n = isCountry(iso) ? parsePhoneNumberFromString(local, iso) : undefined;
  if (!n?.isValid()) throw new Error(`That phone number doesn't look right for ${country || "the chosen country"}. Check the country code and the number.`);
  return { phone: n.number, country: n.country ? countryName(n.country) : country };
}
