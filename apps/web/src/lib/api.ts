const API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8077";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}/api/v1${path}`, {
    ...init,
    next: { revalidate: 300 },
  } as RequestInit);
  if (!res.ok) throw new Error(`API ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

export const fmtAH = (min?: number | null, max?: number | null, ce = false) => {
  if (min == null && max == null) return null;
  if (min === max) return `${min}`;
  if (min != null && max != null) return `${min}–${max}`;
  return `${min ?? "?"}–${max ?? "?"}`;
};

export function rankBadge(rank?: string | null): string {
  if (!rank) return "badge-muted";
  const r = rank.toLowerCase();
  if (r.includes("sahabi")) return "badge-sahabi";
  if (r.includes("thiqa") || r.includes("thabt") || r.includes("hafiz") || r.includes("imam")) return "badge-thiqa";
  if (r.includes("saduq") || r.includes("maqbul")) return "badge-saduq";
  if (r.includes("daif") || r.includes("matruk") || r.includes("kadhdhab") || r.includes("majhul") || r.includes("mudallis")) return "badge-daif";
  return "badge-muted";
}
