import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL ??
  "postgres://ijazah:ijazah@localhost:5433/ijazah";

export const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  prepare: true,
});

/** Mirror of pipelines/ijazah_etl/normalize.py — keep in sync. */
export function normalizeArabic(s: string): string {
  return s
    .normalize("NFC")
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآٱﭐ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ء/g, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
