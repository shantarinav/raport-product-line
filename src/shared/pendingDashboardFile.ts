export type DashboardRoute = "/ssz" | "/tessa" | "/print";

type PendingDashboardFile = {
  route: DashboardRoute;
  file: File;
  createdAt: number;
};

let pendingDashboardFile: PendingDashboardFile | null = null;
let pendingDashboardData: { route: DashboardRoute; data: unknown; createdAt: number } | null = null;

export function setPendingDashboardFile(route: DashboardRoute, file: File) {
  pendingDashboardFile = { route, file, createdAt: Date.now() };
}

export function consumePendingDashboardFile(route: DashboardRoute, maxAgeMs = 120_000): File | null {
  if (!pendingDashboardFile || pendingDashboardFile.route !== route) return null;
  if (Date.now() - pendingDashboardFile.createdAt > maxAgeMs) {
    pendingDashboardFile = null;
    return null;
  }

  const nextFile = pendingDashboardFile.file;
  pendingDashboardFile = null;
  return nextFile;
}

export function readPendingDashboardFile(route: DashboardRoute, maxAgeMs = 120_000): File | null {
  if (!pendingDashboardFile || pendingDashboardFile.route !== route) return null;
  if (Date.now() - pendingDashboardFile.createdAt > maxAgeMs) {
    pendingDashboardFile = null;
    return null;
  }
  return pendingDashboardFile.file;
}

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
