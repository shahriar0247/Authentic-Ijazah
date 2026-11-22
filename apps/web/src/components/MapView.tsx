"use client";

import { useMemo, useState } from "react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface PlacePoint {
  id: number;
  name_ar?: string | null;
  name_en?: string | null;
  kind?: string | null;
  lat: number;
  lng: number;
  events?: number;
}

export function MapView({ places, locale }: { places: PlacePoint[]; locale: string }) {
  const [sel, setSel] = useState<PlacePoint | null>(null);
  const pts = useMemo(() => places.filter((p) => p.lat && p.lng), [places]);

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200" style={{ height: 620 }}>
      <Map
        mapLib={maplibregl}
        initialViewState={{ longitude: 42, latitude: 26, zoom: 3.6 }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      >
        <NavigationControl position="top-right" />
        {pts.map((p) => (
          <Marker key={p.id} longitude={p.lng} latitude={p.lat} anchor="bottom"
            onClick={(e) => { e.originalEvent.stopPropagation(); setSel(p); }}>
            <div
              className="rounded-full border-2 border-white bg-madinah shadow"
              style={{ width: 8 + Math.min(16, (p.events ?? 1) * 2), height: 8 + Math.min(16, (p.events ?? 1) * 2), opacity: 0.8 }}
              role="button"
              aria-label={p.name_ar ?? p.name_en ?? ""}
            />
          </Marker>
        ))}
        {sel && (
          <Popup longitude={sel.lng} latitude={sel.lat} anchor="top" onClose={() => setSel(null)} closeOnClick={false}>
            <div className="p-1">
              <a href={`/${locale}/places/${sel.id}`} className="font-medium text-madinah hover:underline">
                {sel.name_ar ?? sel.name_en}
              </a>
              <div className="text-xs text-stone-500">{sel.kind} · {sel.events} events</div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
