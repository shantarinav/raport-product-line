export type DashboardRoute = "/ssz" | "/tessa" | "/print" | "/support";

let pendingDashboardData: { route: DashboardRoute; data: unknown; createdAt: number } | null = null;

export function setPendingDashboardData(route: DashboardRoute, data: unknown) {
  pendingDashboardData = { route, data, createdAt: Date.now() };
}

export function consumePendingDashboardData<T>(route: DashboardRoute, maxAgeMs = 120_000): T | null {
  if (!pendingDashboardData || pendingDashboardData.route !== route) return null;
  if (Date.now() - pendingDashboardData.createdAt > maxAgeMs) {
    pendingDashboardData = null;
    return null;
  }

  const nextData = pendingDashboardData.data as T;
  pendingDashboardData = null;
  return nextData;
}

export function readPendingDashboardData<T>(route: DashboardRoute, maxAgeMs = 120_000): T | null {
  if (!pendingDashboardData || pendingDashboardData.route !== route) return null;
  if (Date.now() - pendingDashboardData.createdAt > maxAgeMs) {
    pendingDashboardData = null;
    return null;
  }
  return pendingDashboardData.data as T;
}
