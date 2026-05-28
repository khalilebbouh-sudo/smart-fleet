import { Injectable, NgZone, inject } from '@angular/core';
import Pusher from 'pusher-js';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

/**
 * Shared Pusher client for mission trajet streams and fleet-wide channels.
 * Uses the same WebSocket transport as Laravel’s Pusher-compatible broadcaster (not Socket.IO).
 */
@Injectable({ providedIn: 'root' })
export class RealtimePusherService {
  private readonly zone = inject(NgZone);
  private client?: Pusher;

  constructor(
    private auth: AuthService,
    private api: ApiService,
  ) {}

  isConfigured(): boolean {
    return !!environment.pusher.key;
  }

  private getClient(): Pusher | undefined {
    if (!environment.pusher.key) return undefined;
    if (this.client) return this.client;
    const token = this.auth.getToken();
    this.client = new Pusher(environment.pusher.key, {
      cluster: environment.pusher.cluster,
      authEndpoint: `${environment.apiUrl}/pusher/auth`,
      auth: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    });
    return this.client;
  }

  subscribeMissionTrajets(missionId: number, onTrajet: (payload: unknown) => void): () => void {
    const p = this.getClient();
    if (!p) return () => {};
    const name = `private-mission.${missionId}`;
    const ch = p.subscribe(name);
    const handler = (data: unknown) => this.zone.run(() => onTrajet(data));
    ch.bind('trajet.created', handler);
    return () => {
      ch.unbind('trajet.created', handler);
      p.unsubscribe(name);
    };
  }

  subscribeFleetLive(onTrajet: (payload: unknown) => void, onAlert?: (payload: unknown) => void): () => void {
    const p = this.getClient();
    if (!p) return () => {};
    const name = 'private-fleet.live';
    const ch = p.subscribe(name);
    const h1 = (data: unknown) => this.zone.run(() => onTrajet(data));
    const h2 = (data: unknown) => this.zone.run(() => onAlert?.(data));
    ch.bind('trajet.created', h1);
    ch.bind('fleet.alert', h2);
    return () => {
      ch.unbind('trajet.created', h1);
      ch.unbind('fleet.alert', h2);
      p.unsubscribe(name);
    };
  }

  disconnect(): void {
    this.client?.disconnect();
    this.client = undefined;
  }
}
