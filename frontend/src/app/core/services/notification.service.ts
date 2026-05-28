import { Injectable, computed, signal } from '@angular/core';
import Pusher from 'pusher-js';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export type AppNotification = {
  id?: string | null;
  read_at?: string | null;
  created_at?: string | null;
  data: {
    kind: string;
    title: string;
    message: string;
    mission_id?: number | null;
    incident_id?: number | null;
    created_at?: string;
  };
};

@Injectable({ providedIn: 'root' })
export class NotificationService {
  items = signal<AppNotification[]>([]);
  unreadCount = signal<number>(0);
  isEnabled = computed(() => {
    const r = this.auth.currentUser()?.role;
    return (r === 'admin' || r === 'gestionnaire') && !!environment.pusher.key;
  });

  private pusher?: Pusher;
  private channel?: any;

  constructor(
    private api: ApiService,
    private auth: AuthService,
  ) {}

  init(): void {
    const role = this.auth.currentUser()?.role;
    if (role !== 'admin' && role !== 'gestionnaire') return;

    // Load initial notifications
    this.refresh();

    if (!environment.pusher.key) return;
    if (this.pusher) return;

    // Private channel auth via API (Sanctum bearer token)
    const token = this.auth.getToken();
    this.pusher = new Pusher(environment.pusher.key, {
      cluster: environment.pusher.cluster,
      authEndpoint: `${environment.apiUrl}/pusher/auth`,
      auth: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    });

    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    this.channel = this.pusher.subscribe(`private-user.${userId}`);
    this.channel.bind('notification', (payload: any) => {
      const n: AppNotification = {
        id: payload?.id ?? null,
        read_at: null,
        created_at: payload?.created_at ?? null,
        data: payload?.data,
      };
      this.items.set([n, ...this.items()]);
      if (typeof payload?.unread_count === 'number') {
        this.unreadCount.set(payload.unread_count);
      } else {
        this.unreadCount.set(this.unreadCount() + 1);
      }
    });
  }

  refresh(): void {
    const role = this.auth.currentUser()?.role;
    if (role !== 'admin' && role !== 'gestionnaire') return;
    this.api.get<{ data: AppNotification[]; unread_count: number }>('/notifications').subscribe({
      next: (r) => {
        this.items.set(r.data);
        this.unreadCount.set(r.unread_count);
      },
    });
  }

  markRead(id: string): void {
    this.api.post(`/notifications/${id}/read`, {}).subscribe({
      next: () => {
        this.items.set(this.items().map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
        this.unreadCount.set(Math.max(0, this.unreadCount() - 1));
      },
    });
  }

  markAllRead(): void {
    this.api.post('/notifications/read-all', {}).subscribe({
      next: () => {
        const now = new Date().toISOString();
        this.items.set(this.items().map((n) => ({ ...n, read_at: n.read_at ?? now })));
        this.unreadCount.set(0);
      },
    });
  }
}

