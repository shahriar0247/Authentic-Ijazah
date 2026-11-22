import Fastify from "fastify";
import cors from "@fastify/cors";
import { sql, normalizeArabic } from "./db.js";

const app = Fastify({ logger: { level: "info" } });
await app.register(cors, { origin: true });

const api = app;

function badRequest(code: string, message: string) {
  return { error: { code, message } };
}

const limit = (v: unknown, dflt = 20, max = 50) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return dflt;
  return Math.min(Math.floor(n), max);
};

// ---------------------------------------------------------------- stats/health

api.get("/api/v1/health", async () => {
  const r = await sql`SELECT 1 AS ok`;
  return { ok: r[0]?.ok === 1, service: "authentic-ijazah" };
});

api.get("/api/v1/stats", async () => {
  const meta = await sql`SELECT value FROM meta WHERE key = 'etl_stats'`;
  return { stats: meta[0]?.value ?? {} };
});

// ---------------------------------------------------------------- search

api.get("/api/v1/search", async (req, reply) => {
  const { q = "", kind = "all" } = req.query as Record<string, string>;
  const lim = limit(req.query, 20);
  const cursor = Number((req.query as any).cursor ?? 0) || 0;
  const qn = normalizeArabic(q);
  if (!qn || qn.length < 2) return badRequest("SHORT_QUERY", "query too short");

  const out: Record<string, unknown> = { q, normalized: qn };

  if (kind === "all" || kind === "hadith") {
    out.hadiths = await sql`
      SELECT h.id, h.hadith_no, w.title_ar AS work, h.hukm,
             left(h.text_ar, 280) AS snippet,
             similarity(h.search_text, ${qn}) AS score
      FROM hadith_occurrences h JOIN works w ON w.id = h.work_id
      WHERE h.search_text ILIKE ${"%" + qn + "%"}
         OR h.search_text % ${qn}
      ORDER BY score DESC
      LIMIT ${lim} OFFSET ${cursor}`;
  }
  if (kind === "all" || kind === "person") {
    out.persons = await sql`
      SELECT p.id, p.display_name_ar, p.display_name_en, p.tabaqa,
             p.death_ah_min, p.rank_ar, p.rank_norm, p.is_critic, p.is_companion,
             similarity(coalesce(p.search_text,''), ${qn}) AS score
      FROM persons p
      WHERE p.search_text ILIKE ${"%" + qn + "%"} OR p.search_text % ${qn}
         OR EXISTS (SELECT 1 FROM person_names n
                    WHERE n.person_id = p.id AND n.value % ${qn})
      ORDER BY score DESC
      LIMIT ${lim} OFFSET ${cursor}`;
  }
  if (kind === "all" || kind === "topic") {
    out.topics = await sql`
      SELECT id, title_ar, title_en, level, parent_id
      FROM topics
      WHERE title_ar ILIKE ${"%" + q + "%"} OR title_en ILIKE ${"%" + q + "%"}
      LIMIT ${lim} OFFSET ${cursor}`;
  }
  return out;
});

// ---------------------------------------------------------------- hadith

api.get("/api/v1/hadith/:id", async (req, reply) => {
  const id = Number((req.params as any).id);
  const rows = await sql`
    SELECT h.*, w.title_ar AS work_title, w.author_name_ar AS work_author
    FROM hadith_occurrences h JOIN works w ON w.id = h.work_id
    WHERE h.id = ${id}`;
  if (!rows.length)
    return reply.code(404).send(badRequest("NOT_FOUND", "hadith not found"));
  const h = rows[0];
  const [translations, annotations, routes, group] = await Promise.all([
    sql`SELECT lang, narrator, text FROM hadith_translations WHERE hadith_id = ${id}`,
    sql`SELECT a.kind, a.start, a.end, a.person_id, p.display_name_ar AS person_name
        FROM hadith_annotations a LEFT JOIN persons p ON p.id = a.person_id
        WHERE a.hadith_id = ${id} ORDER BY a.start`,
    sql`SELECT id, length, max_rank, hukm FROM isnad_routes WHERE hadith_id = ${id}`,
    h.meaning_group_id
      ? sql`SELECT id, title_ar, taraf_nass, sahaba_qty, repeat_qty, is_qudsi
            FROM meaning_groups WHERE id = ${h.meaning_group_id}`
      : Promise.resolve([]),
  ]);
  return { hadith: h, translations, annotations, routes, group: group[0] ?? null };
});

api.get("/api/v1/hadith/:id/chains", async (req, reply) => {
  const id = Number((req.params as any).id);
  const routes = await sql`
    SELECT id, length, max_rank, hukm FROM isnad_routes
    WHERE hadith_id = ${id} ORDER BY id LIMIT 200`;
  const routeIds = routes.map((r) => r.id);
  const mentions = routeIds.length
    ? await sql`
        SELECT m.route_id, m.pos, m.mention_text, m.verb, m.person_id,
               p.display_name_ar, p.rank_ar, p.rank_norm, p.tabaqa,
               p.is_companion, p.is_stub
        FROM isnad_mentions m
        LEFT JOIN persons p ON p.id = m.person_id
        WHERE m.route_id IN ${sql(routeIds)}
        ORDER BY m.route_id, m.pos DESC`
    : [];
  const byRoute: Record<number, unknown[]> = {};
  for (const m of mentions) (byRoute[m.route_id] ??= []).push(m);
  return { routes: routes.map((r) => ({ ...r, mentions: byRoute[r.id] ?? [] })) };
});

// ---------------------------------------------------------------- meaning group / DAG

api.get("/api/v1/groups/:id", async (req, reply) => {
  const id = Number((req.params as any).id);
  const g = await sql`SELECT * FROM meaning_groups WHERE id = ${id}`;
  if (!g.length)
    return reply.code(404).send(badRequest("NOT_FOUND", "group not found"));

  const hadiths = await sql`
    SELECT h.id, h.hadith_no, h.hukm, w.title_ar AS work
    FROM hadith_occurrences h JOIN works w ON w.id = h.work_id
    WHERE h.meaning_group_id = ${id} ORDER BY h.id LIMIT 500`;

  // merged isnad DAG over all routes of this meaning:
  // pos ascends collector -> companion, so narrator(pos+1) narrates to narrator(pos)
  const edges = await sql`
    SELECT m2.person_id AS teacher, m.person_id AS student,
           count(DISTINCT m.route_id) AS routes
    FROM isnad_mentions m
    JOIN isnad_mentions m2
      ON m2.route_id = m.route_id AND m2.pos = m.pos + 1
    JOIN isnad_routes r ON r.id = m.route_id
    JOIN hadith_occurrences h ON h.id = r.hadith_id
    WHERE h.meaning_group_id = ${id}
    GROUP BY 1, 2
    ORDER BY routes DESC`;

  // route coverage per narrator -> madār heuristic
  const coverage = await sql`
    SELECT m.person_id, count(DISTINCT m.route_id) AS routes,
           min(m.pos) AS min_pos, max(m.pos) AS max_pos
    FROM isnad_mentions m
    JOIN isnad_routes r ON r.id = m.route_id
    JOIN hadith_occurrences h ON h.id = r.hadith_id
    WHERE h.meaning_group_id = ${id}
    GROUP BY m.person_id`;

  const ids = [...new Set([...edges.flatMap((e) => [e.teacher, e.student]),
                           ...coverage.map((c) => c.person_id)])].filter(Boolean);
  const nodes = ids.length
    ? await sql`
        SELECT id, display_name_ar, display_name_en, rank_ar, rank_norm,
               tabaqa, generation_ord, death_ah_min, is_companion, is_critic
        FROM persons WHERE id IN ${sql(ids)}`
    : [];
  const nodeSet = new Map(nodes.map((n) => [n.id, n]));

  const totalRoutes = Math.max(1, new Set(
    await sql`
      SELECT DISTINCT m.route_id
      FROM isnad_mentions m
      JOIN isnad_routes r ON r.id = m.route_id
      JOIN hadith_occurrences h ON h.id = r.hadith_id
      WHERE h.meaning_group_id = ${id}`.then((rs) => rs.map((x) => x.route_id)),
  ).size);

  // madār: highest-coverage narrator who is neither companion nor collector
  const madar = coverage
    .filter((c) => {
      const n = nodeSet.get(c.person_id);
      return n && !n.is_companion && c.min_pos > 0;
    })
    .sort((a, b) => b.routes - a.routes)
    .slice(0, 3)
    .map((c) => ({
      person_id: c.person_id,
      routes: Number(c.routes),
      coverage: Number(c.routes) / totalRoutes,
    }));

  return {
    group: g[0],
    hadiths,
    dag: {
      nodes,
      edges: edges.map((e) => ({
        teacher: e.teacher, student: e.student, routes: Number(e.routes),
      })),
      totalRoutes,
      madar,
    },
  };
});

// ---------------------------------------------------------------- persons

api.get("/api/v1/persons/:id", async (req, reply) => {
  const id = Number((req.params as any).id);
  const rows = await sql`SELECT * FROM persons WHERE id = ${id}`;
  if (!rows.length)
    return reply.code(404).send(badRequest("NOT_FOUND", "person not found"));
  const p = rows[0];
  const [names, ext, jarh, rels, narrationCount, places, matches] =
    await Promise.all([
      sql`SELECT kind, value FROM person_names WHERE person_id = ${id}`,
      sql`SELECT provider, external_id, confidence FROM external_identifiers
          WHERE entity_kind='person' AND entity_id=${id}`,
      sql`SELECT a.id, a.text_ar, a.verdict_class, c.display_name_ar AS critic
          FROM assessments a JOIN persons c ON c.id = a.critic_person_id
          WHERE a.target_person_id = ${id} LIMIT 60`,
      sql`SELECT r.predicate, r.object_id AS other_id, r.weight, r.status,
                 o.display_name_ar AS other_name, o.tabaqa AS other_tabaqa
          FROM person_relationships r JOIN persons o ON o.id = r.object_id
          WHERE r.subject_id = ${id}
          UNION ALL
          SELECT r.predicate, r.subject_id, r.weight, r.status,
                 o.display_name_ar, o.tabaqa
          FROM person_relationships r JOIN persons o ON o.id = r.subject_id
          WHERE r.object_id = ${id}
          LIMIT 300`,
      sql`SELECT count(DISTINCT r.hadith_id) AS c
          FROM isnad_mentions m JOIN isnad_routes r ON r.id = m.route_id
          WHERE m.person_id = ${id}`,
      sql`SELECT e.kind, e.ah_min, e.ah_max, pl.name_ar, pl.name_en, pl.lat, pl.lng
          FROM person_place_events e JOIN places pl ON pl.id = e.place_id
          WHERE e.person_id = ${id}`,
      sql`SELECT m.person_a, m.person_b, m.method, m.confidence, m.status,
                 pa.display_name_ar AS a_name, pb.display_name_ar AS b_name
          FROM person_matches m
          JOIN persons pa ON pa.id = m.person_a
          JOIN persons pb ON pb.id = m.person_b
          WHERE m.person_a = ${id} OR m.person_b = ${id}`,
    ]);
  return {
    person: p,
    names,
    externalIds: ext,
    assessments: jarh,
    relationships: rels,
    narratedHadithCount: Number(narrationCount[0]?.c ?? 0),
    places,
    matches,
  };
});

api.get("/api/v1/persons/:id/hadiths", async (req, reply) => {
  const id = Number((req.params as any).id);
  const lim = limit(req.query, 30, 100);
  const cursor = Number((req.query as any).cursor ?? 0) || 0;
  return await sql`
    SELECT DISTINCT h.id, h.hadith_no, h.hukm, w.title_ar AS work,
           left(h.text_ar, 240) AS snippet
    FROM isnad_mentions m
    JOIN isnad_routes r ON r.id = m.route_id
    JOIN hadith_occurrences h ON h.id = r.hadith_id
    JOIN works w ON w.id = h.work_id
    WHERE m.person_id = ${id}
    ORDER BY h.id
    LIMIT ${lim} OFFSET ${cursor}`;
});

api.get("/api/v1/persons/:id/relationships", async (req, reply) => {
  const id = Number((req.params as any).id);
  const depth = Math.min(Number((req.query as any).depth ?? 1) || 1, 2);
  // bounded traversal over documented edges
  return await sql`
    WITH RECURSIVE g AS (
      SELECT r.subject_id, r.object_id, r.predicate, r.weight, 1 AS depth,
             ARRAY[r.subject_id] AS path
      FROM person_relationships r WHERE r.subject_id = ${id}
      UNION ALL
      SELECT r.subject_id, r.object_id, r.predicate, r.weight, g.depth + 1,
             g.path || r.subject_id
      FROM g JOIN person_relationships r ON r.subject_id = g.object_id
      WHERE g.depth < ${depth} AND NOT r.object_id = ANY(g.path)
      LIMIT 500
    )
    SELECT DISTINCT g.subject_id, g.object_id, g.predicate, g.weight, g.depth,
           ps.display_name_ar AS subject_name, po.display_name_ar AS object_name
    FROM g
    JOIN persons ps ON ps.id = g.subject_id
    JOIN persons po ON po.id = g.object_id`;
});

/** Chain-derived teacher→student edges (co-narration), top weighted. */
api.get("/api/v1/persons/:id/network", async (req, reply) => {
  const id = Number((req.params as any).id);
  const lim = limit(req.query, 80, 200);
  const edges = await sql`
    SELECT m2.person_id AS teacher, m.person_id AS student, count(*) AS weight
    FROM isnad_mentions m
    JOIN isnad_mentions m2
      ON m2.route_id = m.route_id AND m2.pos = m.pos + 1
    WHERE m.person_id = ${id} OR m2.person_id = ${id}
    GROUP BY 1, 2
    ORDER BY weight DESC
    LIMIT ${lim}`;
  const ids = [...new Set(edges.flatMap((e) => [e.teacher, e.student]))];
  const nodes = ids.length
    ? await sql`
        SELECT id, display_name_ar, display_name_en, rank_ar, rank_norm,
               tabaqa, death_ah_min, is_companion, is_critic
        FROM persons WHERE id IN ${sql(ids)}`
    : [];
  return { nodes, edges };
});

/** Shortest documented path between two scholars (BFS, depth ≤ 6). */
api.get("/api/v1/graph/paths", async (req, reply) => {
  const q = req.query as Record<string, string>;
  const from = Number(q.from), to = Number(q.to);
  if (!from || !to) return badRequest("BAD_PARAMS", "from & to required");
  const rows = await sql`
    WITH RECURSIVE bfs AS (
      SELECT m.person_id AS cur, m2.person_id AS nxt, 1 AS depth,
             ARRAY[m.person_id, m2.person_id] AS path
      FROM isnad_mentions m
      JOIN isnad_mentions m2 ON m2.route_id = m.route_id AND m2.pos = m.pos - 1
      WHERE m.person_id = ${from}
      UNION ALL
      SELECT b.nxt, m2.person_id, b.depth + 1, b.path || m2.person_id
      FROM bfs b
      JOIN isnad_mentions m ON m.person_id = b.nxt
      JOIN isnad_mentions m2 ON m2.route_id = m.route_id AND m2.pos = m.pos - 1
      WHERE b.depth < 6 AND NOT m2.person_id = ANY(b.path)
    )
    SELECT DISTINCT path FROM bfs WHERE nxt = ${to} LIMIT 5`;
  const paths = rows.map((r) => r.path);
  const ids = [...new Set(paths.flat())];
  const people = ids.length
    ? await sql`SELECT id, display_name_ar, display_name_en, tabaqa
                FROM persons WHERE id IN ${sql(ids)}`
    : [];
  const pmap = Object.fromEntries(people.map((p) => [p.id, p]));
  return { paths, people: pmap };
});

// ---------------------------------------------------------------- works/topics

api.get("/api/v1/books", async () => {
  return await sql`SELECT * FROM works ORDER BY hadith_count DESC NULLS LAST LIMIT 600`;
});

api.get("/api/v1/books/:id", async (req, reply) => {
  const id = Number((req.params as any).id);
  const w = await sql`SELECT * FROM works WHERE id = ${id}`;
  if (!w.length) return reply.code(404).send(badRequest("NOT_FOUND", "work not found"));
  const lim = limit(req.query, 30, 100);
  const cursor = Number((req.query as any).cursor ?? 0) || 0;
  const hadiths = await sql`
    SELECT id, hadith_no, type, hukm, left(text_ar, 240) AS snippet
    FROM hadith_occurrences WHERE work_id = ${id}
    ORDER BY id LIMIT ${lim} OFFSET ${cursor}`;
  return { work: w[0], hadiths };
});

api.get("/api/v1/topics", async (req) => {
  const parent = (req.query as any).parent;
  if (parent === undefined || parent === "")
    return await sql`SELECT * FROM topics WHERE parent_id IS NULL ORDER BY lft`;
  return await sql`SELECT * FROM topics WHERE parent_id = ${Number(parent)} ORDER BY lft`;
});

api.get("/api/v1/topics/:id", async (req, reply) => {
  const id = Number((req.params as any).id);
  const t = await sql`SELECT * FROM topics WHERE id = ${id}`;
  if (!t.length) return reply.code(404).send(badRequest("NOT_FOUND", "topic not found"));
  const children = await sql`SELECT id, title_ar, title_en, level FROM topics
                             WHERE parent_id = ${id} ORDER BY lft`;
  const meanings = await sql`
    SELECT mg.id, mg.title_ar, mg.is_qudsi
    FROM topic_meanings tm JOIN meaning_groups mg ON mg.id = tm.meaning_group_id
    WHERE tm.topic_id = ${id} LIMIT 60`;
  return { topic: t[0], children, meanings };
});

// ---------------------------------------------------------------- geo/timeline

api.get("/api/v1/places", async () => {
  return await sql`
    SELECT p.*, count(e.id) AS events
    FROM places p LEFT JOIN person_place_events e ON e.place_id = p.id
    GROUP BY p.id ORDER BY events DESC LIMIT 500`;
});

api.get("/api/v1/places/:id", async (req, reply) => {
  const id = Number((req.params as any).id);
  const p = await sql`SELECT * FROM places WHERE id = ${id}`;
  if (!p.length) return reply.code(404).send(badRequest("NOT_FOUND", "place not found"));
  const scholars = await sql`
    SELECT e.kind, e.ah_min, e.ah_max, pr.id, pr.display_name_ar,
           pr.display_name_en, pr.tabaqa
    FROM person_place_events e JOIN persons pr ON pr.id = e.person_id
    WHERE e.place_id = ${id} ORDER BY e.ah_min NULLS LAST LIMIT 200`;
  return { place: p[0], scholars };
});

api.get("/api/v1/timeline", async (req) => {
  const q = req.query as Record<string, string>;
  const start = Number(q.start_ah ?? 1), end = Number(q.end_ah ?? 1500);
  const lim = limit(req.query, 100, 300);
  return await sql`
    SELECT id, display_name_ar, display_name_en, tabaqa, generation_ord,
           birth_ah_min, birth_ah_max, death_ah_min, death_ah_max,
           rank_ar, is_companion, is_critic
    FROM persons
    WHERE coalesce(death_ah_min, 99999) >= ${start}
      AND coalesce(birth_ah_min, -99999) <= ${end}
    ORDER BY death_ah_min NULLS LAST
    LIMIT ${lim}`;
});

// ---------------------------------------------------------------- positions

api.get("/api/v1/positions", async () => {
  return await sql`
    SELECT p.*, count(a.id) AS attributions
    FROM positions p LEFT JOIN position_attributions a ON a.position_id = p.id
    GROUP BY p.id ORDER BY p.id LIMIT 200`;
});

api.get("/api/v1/positions/:id", async (req, reply) => {
  const id = Number((req.params as any).id);
  const pos = await sql`SELECT * FROM positions WHERE id = ${id}`;
  if (!pos.length)
    return reply.code(404).send(badRequest("NOT_FOUND", "position not found"));
  const attrs = await sql`
    SELECT a.*, pr.display_name_ar, pr.display_name_en, pr.tabaqa
    FROM position_attributions a JOIN persons pr ON pr.id = a.person_id
    WHERE a.position_id = ${id}`;
  const evidence = await sql`
    SELECT e.*, pa.person_id
    FROM position_evidence e
    JOIN position_attributions pa ON pa.id = e.attribution_id
    WHERE pa.position_id = ${id}`;
  return { position: pos[0], attributions: attrs, evidence };
});

// ---------------------------------------------------------------- boot

const port = Number(process.env.PORT ?? 8077);
await app.listen({ port, host: "0.0.0.0" });
