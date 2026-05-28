import * as L from 'leaflet';

/**
 * Moves a Leaflet marker smoothly + rotates a child element (car heading, degrees from North).
 */
export class SmoothVehicleMarker {
  private rafId: number | null = null;
  private displayLat = 0;
  private displayLng = 0;
  private targetLat = 0;
  private targetLng = 0;
  private headingDeg = 0;
  private targetHeadingDeg = 0;
  private readonly smoothing = 0.18;
  private readonly headingSmooth = 0.22;

  constructor(
    private marker: L.Marker,
    private rotateEl: HTMLElement | null,
    initial: { lat: number; lng: number },
  ) {
    this.displayLat = initial.lat;
    this.displayLng = initial.lng;
    this.targetLat = initial.lat;
    this.targetLng = initial.lng;
    this.marker.setLatLng([this.displayLat, this.displayLng]);
  }

  setTarget(lat: number, lng: number, headingDeg?: number): void {
    this.targetLat = lat;
    this.targetLng = lng;
    if (headingDeg != null && Number.isFinite(headingDeg)) {
      this.targetHeadingDeg = normalizeHeading(headingDeg);
    }
    if (this.rafId == null) {
      this.rafId = requestAnimationFrame(() => this.tick());
    }
  }

  snapTo(lat: number, lng: number, headingDeg?: number): void {
    this.displayLat = lat;
    this.displayLng = lng;
    this.targetLat = lat;
    this.targetLng = lng;
    if (headingDeg != null && Number.isFinite(headingDeg)) {
      this.headingDeg = normalizeHeading(headingDeg);
      this.targetHeadingDeg = this.headingDeg;
    }
    this.marker.setLatLng([lat, lng]);
    this.applyHeading();
  }

  private tick(): void {
    this.rafId = null;
    const dx = this.targetLat - this.displayLat;
    const dy = this.targetLng - this.displayLng;
    let moved = false;
    if (Math.abs(dx) > 1e-7 || Math.abs(dy) > 1e-7) {
      this.displayLat += dx * this.smoothing;
      this.displayLng += dy * this.smoothing;
      this.marker.setLatLng([this.displayLat, this.displayLng]);
      moved = true;
    } else {
      this.displayLat = this.targetLat;
      this.displayLng = this.targetLng;
      this.marker.setLatLng([this.displayLat, this.displayLng]);
    }

    const dh = shortestAngleDiff(this.headingDeg, this.targetHeadingDeg);
    if (Math.abs(dh) > 0.3) {
      this.headingDeg = normalizeHeading(this.headingDeg + dh * this.headingSmooth);
      this.applyHeading();
      moved = true;
    } else {
      this.headingDeg = this.targetHeadingDeg;
      this.applyHeading();
    }

    if (moved || Math.abs(dx) > 1e-8 || Math.abs(dy) > 1e-8 || Math.abs(shortestAngleDiff(this.headingDeg, this.targetHeadingDeg)) > 0.1) {
      this.rafId = requestAnimationFrame(() => this.tick());
    }
  }

  private applyHeading(): void {
    if (!this.rotateEl) return;
    this.rotateEl.style.transform = `rotate(${this.headingDeg}deg)`;
  }

  destroy(): void {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

function normalizeHeading(d: number): number {
  return ((d % 360) + 360) % 360;
}

function shortestAngleDiff(from: number, to: number): number {
  let diff = normalizeHeading(to) - normalizeHeading(from);
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}
