import * as L from 'leaflet';

/** Leaflet DivIcon: top-down car SVG, rotated via inner element (heading degrees from North). */
export function createVehicleDivIcon(): L.DivIcon {
  const html = `
<div class="vehicle-leaflet-root">
  <div class="vehicle-leaflet-car" data-rotate="0">
    <svg viewBox="0 0 48 48" width="42" height="42" aria-hidden="true">
      <defs>
        <linearGradient id="carGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#34d399"/>
          <stop offset="100%" style="stop-color:#0f766e"/>
        </linearGradient>
      </defs>
      <path fill="url(#carGrad)" stroke="#ffffff" stroke-width="1.5"
        d="M24 4 L38 14 L40 28 L36 42 L12 42 L8 28 L10 14 Z"/>
      <rect x="14" y="16" width="20" height="10" rx="2" fill="rgba(255,255,255,.35)"/>
      <circle cx="24" cy="38" r="3" fill="#111827"/>
    </svg>
  </div>
</div>`;
  return L.divIcon({
    className: 'vehicle-leaflet-wrap',
    html,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}
