import Dexie from "dexie";
import type { LocalA3Protocol } from "../domain/localA3Types";

export async function seedLocalA3LegacyV1Database(dbName: string, protocols: LocalA3Protocol[]): Promise<void> {
  const legacyDb = new Dexie(dbName);
  legacyDb.version(1).stores({
    protocols: "id,status,dashboardType,updatedAt,createdAt,form.dueDate",
    events: "id,protocolId,createdAt,type",
  });

  for (const protocol of protocols) {
    await legacyDb.table("protocols").put(protocol);
  }

  legacyDb.close();
}
