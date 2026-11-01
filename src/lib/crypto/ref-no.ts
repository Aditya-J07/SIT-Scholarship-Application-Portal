import crypto from "crypto";

/**
 * Generates an unambiguous application reference number:
 * SIT-<CODE>-<YEAR>-<6 random characters from an unambiguous alphabet>
 * Excludes ambiguous characters (0, O, 1, I, L)
 */
export function generateUnambiguousRefNo(scholarshipCode: string, year: number): string {
  const chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const bytes = crypto.randomBytes(6);
  let rand = "";
  for (let i = 0; i < 6; i++) {
    rand += chars[bytes[i] % chars.length];
  }
  return `SIT-${scholarshipCode.toUpperCase()}-${year}-${rand}`;
}
