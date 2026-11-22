// API smoke test — asserts each surface returns real data, not just 200s.
// Usage: API=http://127.0.0.1:8077 node scripts/smoke.mjs
const API = process.env.API ?? "http://127.0.0.1:8077";

const checks = [
  ["/api/v1/health", (d) => d.ok === true],
  ["/api/v1/stats", (d) => Number(d.stats?.hadith_occurrences) > 700_000],
  ["/api/v1/search?q=%D8%A7%D9%84%D8%B2%D9%87%D8%B1%D9%8A&kind=person&limit=3",
    (d) => d.persons?.length > 0 && d.persons[0].display_name_ar],
  ["/api/v1/search?q=%D8%B5%D9%84%D8%A7%D8%A9&kind=hadith&limit=3",
    (d) => d.hadiths?.length > 0],
  ["/api/v1/search?q=%D8%B5%D9%84%D8%A7%D8%A9&kind=group&limit=3",
    (d) => d.groups?.length > 0],
  ["/api/v1/hadith/1", (d) => d.hadith?.text_ar?.length > 100],
  ["/api/v1/hadith/1/chains",
    (d) => d.routes?.[0]?.mentions?.length > 3],
  ["/api/v1/hadith/1/dag",
    (d) => d.nodes?.length > 3 && d.edges?.length > 3],
  ["/api/v1/related/hadiths/2?limit=3",
    (d) => Array.isArray(d) && d.length > 0 && d[0].distance < 0.1],
  ["/api/v1/groups/319",
    (d) => d.dag?.madar?.length > 0 && d.dag.madar[0].coverage > 0.5],
  ["/api/v1/persons/5913",
    (d) => d.person?.flags?.isBukhari === true || d.person?.is_companion],
  ["/api/v1/persons/5913/network",
    (d) => d.edges?.length > 0],
  ["/api/v1/scholars?sahih=both&limit=3", (d) => d.length >= 3],
  ["/api/v1/scholars?flags=tadlis&limit=3", (d) => d.length >= 3],
  ["/api/v1/graph/paths?from=6805&to=5913",
    (d) => d.paths?.length > 0 && d.paths[0].length >= 2],
  ["/api/v1/books", (d) => d.length > 400],
  ["/api/v1/topics", (d) => d.length > 0],
  ["/api/v1/positions", (d) => d.length >= 10],
  ["/api/v1/positions/2",
    (d) => d.attributions?.length >= 3 && d.evidence?.length > 0],
  ["/api/v1/places", (d) => d.length > 50],
  ["/api/v1/timeline?start_ah=1&end_ah=100&limit=5",
    (d) => d.length > 0 && d[0].death_ah_min <= 100],
  // negative cases
  ["/api/v1/persons/abc", (d) => d.error?.code === "NOT_FOUND"],
  ["/api/v1/hadith/xyz", (d) => d.error?.code === "NOT_FOUND"],
];

let fail = 0;
for (const [path, check] of checks) {
  try {
    const t = Date.now();
    const res = await fetch(`${API}${path}`);
    const d = await res.json();
    const ok = check(d);
    console.log(`${ok ? "PASS" : "FAIL"} ${path} (${Date.now() - t}ms)`);
    if (!ok) fail++;
  } catch (e) {
    console.log(`FAIL ${path} — ${e.message}`);
    fail++;
  }
}
console.log(fail ? `\n${fail} failing` : "\nall green");
process.exit(fail ? 1 : 0);
