export type DashboardType = "ssz" | "tessa" | "print" | "support";
export type SnapshotGrain = "report" | "month";

export interface DashboardSnapshot {
  id: string;
  dashboardType: DashboardType;
  grain: SnapshotGrain;
  period: {
    from: string;
    to: string;
  };
  coverage?: {
    from: string;
    to: string;
    days: number;
    periodDays: number;
    ratio: number;
    isTrendReady: boolean;
  };
  meta: {
    savedAt: string;
  };
  metrics: Record<string, number>;
}

const DB_NAME = "raport_history";
const DB_VERSION = 1;
const SNAPSHOTS_STORE = "snapshots";
const DASHBOARD_TYPE_INDEX = "dashboardType";

let dbPromise: Promise<IDBDatabase> | null = null;

function indexedDBAvailable(): IDBFactory {
  if (typeof window === "undefined" || !window.indexedDB) {
    throw new Error("IndexedDB is not available in this environment.");
  }
  return window.indexedDB;
}

export function initDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDBAvailable().open(DB_NAME, DB_VERSION);
    } catch (error) {
      reject(error);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.objectStoreNames.contains(SNAPSHOTS_STORE)
        ? request.transaction?.objectStore(SNAPSHOTS_STORE)
        : db.createObjectStore(SNAPSHOTS_STORE, { keyPath: "id" });

      if (store && !store.indexNames.contains(DASHBOARD_TYPE_INDEX)) {
        store.createIndex(DASHBOARD_TYPE_INDEX, DASHBOARD_TYPE_INDEX, { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
    request.onblocked = () => reject(new Error("IndexedDB upgrade is blocked by another tab."));
  });

  return dbPromise;
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
): Promise<T> {
  return initDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(SNAPSHOTS_STORE, mode);
        const store = transaction.objectStore(SNAPSHOTS_STORE);

        transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
        transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));

        action(store, resolve, reject);
      }),
  );
}

export function putSnapshot(snapshot: DashboardSnapshot): Promise<void> {
  return runTransaction<void>("readwrite", (store, resolve, reject) => {
    const getRequest = store.get(snapshot.id);

    getRequest.onsuccess = () => {
      const existing = getRequest.result as DashboardSnapshot | undefined;
      const existingCoverage = existing?.coverage?.ratio ?? -1;
      const nextCoverage = snapshot.coverage?.ratio ?? -1;

      // Keep the fuller monthly snapshot. Equal coverage is overwritten by the latest upload.
      if (existing && existingCoverage > nextCoverage) {
        resolve();
        return;
      }

      const putRequest = store.put(snapshot);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error ?? new Error("Failed to save dashboard snapshot."));
    };

    getRequest.onerror = () => reject(getRequest.error ?? new Error("Failed to read existing dashboard snapshot."));
  });
}

export function getSnapshots(dashboardType: DashboardType): Promise<DashboardSnapshot[]> {
  return runTransaction<DashboardSnapshot[]>("readonly", (store, resolve, reject) => {
    const snapshots: DashboardSnapshot[] = [];
    const index = store.index(DASHBOARD_TYPE_INDEX);
    const request = index.openCursor(IDBKeyRange.only(dashboardType));

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(snapshots.sort((left, right) => left.period.from.localeCompare(right.period.from)));
        return;
      }
      snapshots.push(cursor.value as DashboardSnapshot);
      cursor.continue();
    };
    request.onerror = () => reject(request.error ?? new Error("Failed to read dashboard snapshots."));
  });
}

export function deleteSnapshot(id: string): Promise<void> {
  return runTransaction<void>("readwrite", (store, resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to delete dashboard snapshot."));
  });
}

export function clearDashboardHistory(dashboardType: string): Promise<void> {
  return runTransaction<void>("readwrite", (store, resolve, reject) => {
    const index = store.index(DASHBOARD_TYPE_INDEX);
    const request = index.openCursor(IDBKeyRange.only(dashboardType));

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }

      const deleteRequest = cursor.delete();
      deleteRequest.onsuccess = () => cursor.continue();
      deleteRequest.onerror = () => reject(deleteRequest.error ?? new Error("Failed to clear dashboard history."));
    };
    request.onerror = () => reject(request.error ?? new Error("Failed to read dashboard history for cleanup."));
  });
}
