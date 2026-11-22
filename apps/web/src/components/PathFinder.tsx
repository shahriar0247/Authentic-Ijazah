"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8077";

interface PersonLite { id: number; display_name_ar?: string | null; display_name_en?: string | null }

const pName = (p: PersonLite | undefined, locale: string) =>
  locale === "en" ? (p?.display_name_en ?? p?.display_name_ar) : (p?.display_name_ar ?? p?.display_name_en);

export function PathFinder({ locale }: { locale: string }) {
  const [sel, setSel] = useState<{ a: PersonLite | null; b: PersonLite | null }>({ a: null, b: null });
  const [paths, setPaths] = useState<number[][] | null>(null);
  const [people, setPeople] = useState<Record<string, PersonLite>>({});
  const [busy, setBusy] = useState(false);

  const pick = async (which: "a" | "b", q: string) => {
    const r = await fetch(`${API}/api/v1/search?q=${encodeURIComponent(q)}&kind=person&limit=5`);
    const d = await r.json();
    return (d.persons ?? []).map((p: any) => ({ id: Number(p.id), display_name_ar: p.display_name_ar, display_name_en: p.display_name_en }));
  };

  const run = async () => {
    if (!sel.a || !sel.b || sel.a.id < 0 || sel.b.id < 0) return;
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/v1/graph/paths?from=${sel.a.id}&to=${sel.b.id}`);
      const d = await r.json();
      setPaths(d.paths ?? []);
      setPeople(d.people ?? {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-4 text-sm">
      <div className="mb-2 font-medium text-stone-600">
        {locale === "ar" ? "طريق الرواية بين راويين" : "Transmission path between two narrators"}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <PersonPicker label="A" onPick={(p) => setSel((s) => ({ ...s, a: p }))} picked={sel.a} search={pick} locale={locale} />
        <PersonPicker label="B" onPick={(p) => setSel((s) => ({ ...s, b: p }))} picked={sel.b} search={pick} locale={locale} />
        <button type="button" onClick={run}
          disabled={!sel.a || !sel.b || sel.a.id < 0 || sel.b.id < 0 || busy}
          className="rounded-lg bg-madinah px-4 py-1.5 text-white disabled:opacity-40">
          {busy ? "…" : locale === "ar" ? "اعرض الطريق" : "Find path"}
        </button>
      </div>
      {paths && (
        <div className="mt-3">
          {paths.length === 0 && <p className="text-stone-500">{locale === "ar" ? "لا طريق موثقًا" : "no documented path"}</p>}
          {paths.map((p, i) => (
            <div key={i} className="flex flex-wrap items-center gap-1" dir="rtl">
              {p.map((id, j) => (
                <span key={j} className="flex items-center gap-1">
                  <a href={`/${locale}/persons/${id}`} className="rounded-md bg-stone-100 px-2 py-0.5 hover:ring-1 hover:ring-madinah">
                    {pName(people[String(id)], locale) ?? id}
                  </a>
                  {j < p.length - 1 && <span className="text-stone-400">◂</span>}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PersonPicker({ label, picked, onPick, search, locale }: {
  label: string; picked: PersonLite | null;
  onPick: (p: PersonLite) => void;
  search: (w: "a" | "b", q: string) => Promise<PersonLite[]>;
  locale: string;
}) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<PersonLite[]>([]);
  return (
    <div className="relative">
      <input
        value={q}
        onChange={async (e) => {
          setQ(e.target.value);
          onPick({ id: -1, display_name_ar: null, display_name_en: null });
          if (e.target.value.length >= 2) setOpts(await search(label === "A" ? "a" : "b", e.target.value));
        }}
        placeholder={label}
        aria-label={label === "A" ? "first narrator" : "second narrator"}
        className="w-48 rounded-lg border border-stone-300 px-2 py-1.5"
      />
      {!!opts.length && (
        <ul className="absolute z-10 mt-1 w-full rounded-lg border border-stone-200 bg-white shadow-lg">
          {opts.map((o) => (
            <li key={o.id}>
              <button type="button" className="w-full px-2 py-1 text-start hover:bg-stone-50"
                onClick={() => { onPick(o); setQ(pName(o, locale) ?? ""); setOpts([]); }}>
                {pName(o, locale)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
