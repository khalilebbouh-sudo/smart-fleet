/** Bearing in degrees (0 = North, 90 = East) from A to B. */
export function bearingDeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/** Minimum distance (m) from point P to a polyline defined by latLngs [lat,lng][]. */
export function minDistanceToPolylineM(
  p: { lat: number; lng: number },
  latLngs: [number, number][],
): number {
  if (latLngs.length === 0) return Infinity;
  if (latLngs.length === 1) {
    return haversineM(p, { lat: latLngs[0][0], lng: latLngs[0][1] });
  }
  let min = Infinity;
  for (let i = 0; i < latLngs.length - 1; i++) {
    const a = { lat: latLngs[i][0], lng: latLngs[i][1] };
    const b = { lat: latLngs[i + 1][0], lng: latLngs[i + 1][1] };
    min = Math.min(min, distancePointToSegmentM(p, a, b));
  }
  return min;
}

function distancePointToSegmentM(
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  // Project onto segment in equirectangular approximation (good enough for city scale).
  const toXY = (ll: { lat: number; lng: number }) => ({
    x: (ll.lng * Math.PI) / 180 * Math.cos(((p.lat + ll.lat) / 2) * (Math.PI / 180)) * 6371000,
    y: (ll.lat * Math.PI) / 180 * 6371000,
  });
  const P = toXY(p);
  const A = toXY(a);
  const B = toXY(b);
  const abx = B.x - A.x;
  const aby = B.y - A.y;
  const apx = P.x - A.x;
  const apy = P.y - A.y;
  const ab2 = abx * abx + aby * aby;
  if (ab2 < 1e-6) return haversineM(p, a);
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  const cx = A.x + t * abx;
  const cy = A.y + t * aby;
  const dx = P.x - cx;
  const dy = P.y - cy;
  return Math.sqrt(dx * dx + dy * dy);
}

function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
