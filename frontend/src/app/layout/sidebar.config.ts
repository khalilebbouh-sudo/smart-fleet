import type { Observable } from 'rxjs';

export type AppRole = 'admin' | 'gestionnaire' | 'user';

export type SidebarBadge = {
  type: 'count';
  value$: Observable<number>;
};

export type SidebarItem = {
  key: string;
  labelKey: string; // i18n key
  route: string;
  icon: 'dashboard' | 'vehicle' | 'drivers' | 'missions' | 'maintenance' | 'fuel' | 'alerts' | 'users' | 'trajets' | 'incident' | 'fleet';
  badge?: SidebarBadge;
  roles: AppRole[];
  exact?: boolean;
  /** Affiche un titre de section au-dessus de ce lien (ex. « Gestionnaire » pour le rôle gestionnaire). */
  sectionLabelKey?: string;
  sectionForRoles?: AppRole[];
};

export function getSidebarItems(opts: { alertsCount$: Observable<number> }): SidebarItem[] {
  const base: SidebarItem[] = [
    { key: 'dashboard', labelKey: 'NAV.DASHBOARD', route: '/dashboard', icon: 'dashboard', roles: ['admin', 'gestionnaire', 'user'], exact: true },
    {
      key: 'vehicles',
      labelKey: 'NAV.VEHICLES',
      route: '/vehicles',
      icon: 'vehicle',
      roles: ['admin', 'gestionnaire'],
      sectionLabelKey: 'NAV.GESTIONNAIRE',
      sectionForRoles: ['gestionnaire'],
    },
    { key: 'drivers', labelKey: 'NAV.DRIVERS', route: '/drivers', icon: 'drivers', roles: ['admin', 'gestionnaire'] },
    { key: 'fleetLive', labelKey: 'NAV.FLEET_LIVE', route: '/fleet/live', icon: 'fleet', roles: ['admin', 'gestionnaire'] },
    { key: 'missions', labelKey: 'NAV.MISSIONS', route: '/missions', icon: 'missions', roles: ['admin', 'gestionnaire'] },
    { key: 'myMissions', labelKey: 'NAV.MY_MISSIONS', route: '/my-missions', icon: 'missions', roles: ['user'] },
    { key: 'trajets', labelKey: 'NAV.TRAJETS', route: '/trajets', icon: 'trajets', roles: ['user'] },
    { key: 'reportIncident', labelKey: 'NAV.REPORT_INCIDENT', route: '/incidents/report', icon: 'incident', roles: ['user'] },
    { key: 'maintenances', labelKey: 'NAV.MAINTENANCE', route: '/maintenances', icon: 'maintenance', roles: ['admin', 'gestionnaire'] },
    { key: 'fuel', labelKey: 'NAV.FUEL', route: '/fuel', icon: 'fuel', roles: ['admin', 'gestionnaire'] },
    { key: 'alerts', labelKey: 'NAV.ALERTS', route: '/alerts', icon: 'alerts', roles: ['admin', 'gestionnaire', 'user'], badge: { type: 'count', value$: opts.alertsCount$ } },
    { key: 'users', labelKey: 'NAV.USER_MANAGEMENT', route: '/admin/users', icon: 'users', roles: ['admin'] },
  ];

  return base;
}

