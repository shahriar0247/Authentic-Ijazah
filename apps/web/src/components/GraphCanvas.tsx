"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";
import { useRouter } from "next/navigation";
import { nameEn } from "@/lib/en";

const elk = new ELK();

export interface GNode {
  id: number;
  display_name_ar?: string | null;
  display_name_en?: string | null;
  rank_norm?: string | null;
  rank_ar?: string | null;
  tabaqa?: string | null;
  is_companion?: boolean;
  is_critic?: boolean;
  flags?: {
    jarh_grade?: number;
    deviance?: string[];
    tashayyu?: boolean;
    hasTadlis?: boolean;
    hasIkhtilat?: boolean;
  } | null;
}
export interface GEdge {
  teacher: number;
  student: number;
  routes?: number;
  weight?: number;
}

const SEVERE_DEVIANCE = new Set([
  "tashayyu",
  "tashayyu_accused",
  "kadhib",
  "matruk",
  "bidah",
]);

function nodeColor(n: GNode): string {
  const grade = n.flags?.jarh_grade ?? -1;
  const tags = n.flags?.deviance ?? [];
  if (grade >= 3 || n.flags?.tashayyu || tags.some((t) => SEVERE_DEVIANCE.has(t)))
    return "#fecaca"; // strong red — accused fabricator / deviant
  if (grade === 2 || tags.includes("matruk")) return "#f8d7d0"; // hard jarh
  if (grade === 1 || n.flags?.hasTadlis || n.flags?.hasIkhtilat)
    return "#fde68a"; // soft jarh / needs scrutiny
  if (n.is_companion) return "#f3e8ff";
  const r = (n.rank_norm ?? "").toLowerCase();
  if (r.includes("thiqa") || r.includes("thabt") || r.includes("imam")) return "#d1f2e0";
  if (r.includes("daif") || r.includes("matruk") || r.includes("kadhdhab")) return "#f8d7d0";
  if (r.includes("saduq") || r.includes("maqbul")) return "#f3ecd0";
  return "#ffffff";
}

async function layout(gn: GNode[], ge: GEdge[], dir: "UP" | "RIGHT", locale?: string) {
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": dir === "UP" ? "UP" : "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "48",
      "elk.spacing.nodeNode": "24",
    },
    children: gn.map((n) => ({ id: String(n.id), width: 190, height: 56 })),
    edges: ge.map((e, i) => ({
      id: `e${i}`,
      sources: [String(e.teacher)],
      targets: [String(e.student)],
    })),
  };
  const res = await elk.layout(graph);
  const pos = new Map(
    res.children?.map((c) => [c.id, { x: c.x ?? 0, y: c.y ?? 0 }]),
  );
  return {
    nodes: gn.map((n) => ({
      id: String(n.id),
      position: pos.get(String(n.id)) ?? { x: 0, y: 0 },
      data: { label: (locale === "en" ? nameEn(n) : n.display_name_ar ?? n.display_name_en) ?? `#${n.id}`, node: n },
      style: {
        background: nodeColor(n),
        border: `1.5px solid ${
          n.is_critic
            ? "#0284c7"
            : (n.flags?.jarh_grade ?? -1) >= 2 ||
                n.flags?.tashayyu ||
                (n.flags?.deviance ?? []).some((t) => SEVERE_DEVIANCE.has(t))
              ? "#dc2626"
              : "#d6d3d1"
        }`,
        borderRadius: 10,
        fontSize: 12,
        padding: 8,
        width: 190,
      },
    })) as Node[],
    edges: ge.map((e, i) => ({
      id: `e${i}`,
      source: String(e.teacher),
      target: String(e.student),
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
      style: { strokeWidth: Math.min(4, 1 + Math.log2((e.routes ?? e.weight ?? 1))), stroke: "#a8a29e" },
      label: (e.routes ?? e.weight ?? 0) > 1 ? `${e.routes ?? e.weight}` : undefined,
      labelStyle: { fontSize: 10 },
    })) as Edge[],
  };
}

export function GraphCanvas({
  nodes,
  edges,
  locale,
  direction = "UP",
  height = 560,
}: {
  nodes: GNode[];
  edges: GEdge[];
  locale: string;
  direction?: "UP" | "RIGHT";
  height?: number;
}) {
  const [el, setEl] = useState<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const router = useRouter();
  const ids = useMemo(() => nodes.map((n) => n.id).join(","), [nodes]);

  useEffect(() => {
    let live = true;
    layout(nodes, edges, direction, locale).then((r) => live && setEl(r));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, edges.length, locale]);

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white" style={{ height }}>
      <ReactFlow
        nodes={el.nodes}
        edges={el.edges}
        fitView
        minZoom={0.15}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, n) => {
          const node = (n.data as any).node as GNode;
          if (node?.id) router.push(`/${locale}/persons/${node.id}`);
        }}
        nodesDraggable
      >
        <Background gap={18} color="#e7e5e4" />
        <MiniMap pannable zoomable />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
