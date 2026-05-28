import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';

/**
 * Parsed OSRM driving route. Same HTTP API as **Leaflet Routing Machine**’s OSRMv1 router,
 * proxied via Laravel (`/api/osrm/route`) for CORS and optional self-hosted OSRM.
 */
export type OsrmDrivingRoute = {
  distanceM: number;
  durationSec: number;
  /** Leaflet-friendly [lat, lng][] along roads */
  latLngs: [number, number][];
  /** Turn-by-turn when requested */
  steps?: OsrmNavStep[];
};

export type OsrmNavStep = {
  distanceM: number;
  durationSec: number;
  instruction: string;
  /** Distance along route until this step completes (from OSRM leg start) — unused here */
};

type OsrmApiResponse = {
  code: string;
  message?: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry?: { type?: string; coordinates: [number, number][] };
    legs?: Array<{
      steps?: Array<{
        distance: number;
        duration: number;
        name?: string;
        maneuver?: { type?: string; modifier?: string };
      }>;
    }>;
  }>;
};

@Injectable({ providedIn: 'root' })
export class OsrmRouteService {
  constructor(private api: ApiService) {}

  getDrivingRoute(
    points: { lat: number; lng: number }[],
    opts?: { steps?: boolean },
  ): Observable<OsrmDrivingRoute> {
    if (points.length < 2) {
      throw new Error('At least two points required.');
    }
    const coordinates = points.map((p) => `${p.lng},${p.lat}`).join(';');
    const params: Record<string, string | boolean> = { coordinates };
    if (opts?.steps) {
      params['steps'] = true;
    }
    return this.api.get<OsrmApiResponse>('/osrm/route', params).pipe(map((res) => this.parse(res, !!opts?.steps)));
  }

  private parse(res: OsrmApiResponse, withSteps: boolean): OsrmDrivingRoute {
    if (res.code !== 'Ok' || !res.routes?.[0]?.geometry?.coordinates) {
      const msg = res.message || res.code || 'NoRoute';
      throw new Error(msg);
    }
    const r = res.routes[0];
    const coords = r.geometry!.coordinates;
    const latLngs: [number, number][] = coords.map(([lng, lat]) => [lat, lng]);

    let steps: OsrmNavStep[] | undefined;
    if (withSteps && r.legs?.[0]?.steps?.length) {
      steps = r.legs[0].steps.map((s) => ({
        distanceM: s.distance,
        durationSec: s.duration,
        instruction: formatOsrmStep(s),
      }));
    }

    return {
      distanceM: r.distance,
      durationSec: r.duration,
      latLngs,
      steps,
    };
  }
}

function formatOsrmStep(s: {
  distance: number;
  duration: number;
  name?: string;
  maneuver?: { type?: string; modifier?: string };
}): string {
  const d = Math.max(0, Math.round(s.distance));
  const road = s.name ? ` sur ${s.name}` : '';
  const m = s.maneuver?.modifier;
  const t = s.maneuver?.type;

  if (t === 'depart') {
    return `Démarrez${road} — ${d} m`;
  }
  if (t === 'arrive') {
    return 'Vous êtes arrivé à destination.';
  }
  if (m === 'right' || m === 'sharp right' || m === 'slight right') {
    return `Tournez à droite${road} dans ${d} m`;
  }
  if (m === 'left' || m === 'sharp left' || m === 'slight left') {
    return `Tournez à gauche${road} dans ${d} m`;
  }
  if (t === 'roundabout' || t === 'rotary') {
    return `Rond-point — ${d} m`;
  }
  if (t === 'continue' || t === 'new name') {
    return `Continuez tout droit${road} — ${d} m`;
  }
  return `Manœuvre${road} — ${d} m`;
}
