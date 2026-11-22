"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBox({
  locale,
  placeholder,
  initial = "",
}: {
  locale: string;
  placeholder: string;
  initial?: string;
}) {
  const [q, setQ] = useState(initial);
  const router = useRouter();
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/${locale}/search?q=${encodeURIComponent(q)}`);
      }}
      className="flex gap-2"
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-xl border border-stone-300 bg-white/80 px-4 py-3 text-lg shadow-sm outline-none focus:border-madinah focus:ring-2 focus:ring-madinah/25"
      />
      <button
        type="submit"
        className="rounded-xl bg-madinah px-5 py-3 font-medium text-white shadow-sm transition hover:bg-madinah/90"
      >
        🔍
      </button>
    </form>
  );
}
