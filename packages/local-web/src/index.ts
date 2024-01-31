import type { Optq } from "@optq/core";
import {
  type OptqSchema,
  type OptqDatabase,
  installOptqLocalDatabaseHelper,
  OPTQ_DATABASE_VERSION,
} from "@optq/local";
import { type IDBPDatabase, openDB } from "idb";

export default async function installOptqLocalDatabase<Api extends { OPTQ_VALIDATED: true }>(
  optq: Optq<Api>,
  databaseName: string = "optq",
) {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not supported in this environment");
  }
  const database = await OptqWebDatabase.new(databaseName);
  await installOptqLocalDatabaseHelper(optq, database);
}

interface MetadataSchema {
  metadata: {
    key: 0;
    value: {
      id: 0;
      apiVersion?: number;
    };
  };
}

class OptqWebDatabase implements OptqDatabase {
  private constructor(
    public readonly database: IDBPDatabase<OptqSchema & MetadataSchema>,
    public readonly name: string,
  ) {}

  static async new(name = "optq") {
    const database = await openDB<OptqSchema & MetadataSchema>(name, OPTQ_DATABASE_VERSION, {
      upgrade(database: IDBPDatabase<OptqSchema & MetadataSchema>, oldVersion: number) {
        let version = oldVersion;

        if (version < 1) {
          if (!database.objectStoreNames.contains("metadata")) {
            database.createObjectStore("metadata");
          }

          if (!database.objectStoreNames.contains("requests")) {
            database.createObjectStore("requests");
          }
          if (!database.objectStoreNames.contains("caches")) {
            const cacheStore = database.createObjectStore("caches", { autoIncrement: true });
            cacheStore.createIndex("resId, hash", ["resId", "hash"]);
          }
          if (!database.objectStoreNames.contains("predictions")) {
            const predictionStore = database.createObjectStore("predictions", {
              autoIncrement: true,
            });
            predictionStore.createIndex("resId, hash", ["resId", "hash"]);
          }

          version = 1;
        }
      },
    });

    return new OptqWebDatabase(database, name);
  }

  async getMetadata() {
    const entry = await this.database.get("metadata", 0);
    return {
      version: this.database.version,
      apiVersion: entry?.apiVersion,
    };
  }

  async setMetadata({ apiVersion }: { version: number; apiVersion?: number }) {
    return void (await this.database.put("metadata", { id: 0, apiVersion }, 0));
  }

  getAllRequests() {
    return this.database.getAll("requests");
  }

  getAllCaches() {
    return this.database.getAll("caches");
  }

  getAllPredictions() {
    return this.database.getAll("predictions").then((predictions) => {
      return predictions;
    });
  }

  async deleteRequest({ id }: { id: string }) {
    await this.database.delete("requests", id);
  }

  async deleteCache({ resId, hash }: { resId: string; hash: string }) {
    const entry = await this.database.getKeyFromIndex("caches", "resId, hash", [resId, hash]);
    if (entry === undefined) return;
    await this.database.delete("caches", entry);
  }

  async deletePrediction({ resId, hash }: { resId: string; hash: string }) {
    const entry = await this.database.getKeyFromIndex("predictions", "resId, hash", [resId, hash]);
    if (entry === undefined) return;
    await this.database.delete("predictions", entry);
  }

  async upsertRequest(request: OptqSchema["requests"]["value"]) {
    await this.database.put("requests", request, request.id);
  }
  async upsertCache({
    resId,
    hash,
    value,
    respondedAt,
  }: OptqSchema["caches"]["value"]): Promise<void> {
    const entry = await this.database.getKeyFromIndex("caches", "resId, hash", [resId, hash]);
    await this.database.put("caches", { resId, hash, value, respondedAt }, entry);
  }
  async upsertPrediction({
    resId,
    hash,
    value,
  }: OptqSchema["predictions"]["value"]): Promise<void> {
    const entry = await this.database.getKeyFromIndex("predictions", "resId, hash", [resId, hash]);
    await this.database.put("predictions", { resId, hash, value }, entry);
  }
}
