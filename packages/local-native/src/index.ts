import type { Optq } from "@optq/core";
import {
  type OptqSchema,
  type OptqDatabase,
  installOptqLocalDatabaseHelper,
  OPTQ_DATABASE_VERSION,
} from "@optq/local";
import { open, type OPSQLiteConnection } from "@op-engineering/op-sqlite";

export default async function installOptqLocalDatabase<Api extends { OPTQ_VALIDATED: true }>(
  optq: Optq<Api>,
  databaseName: string = "optq",
) {
  const isNative =
    typeof window.document === "undefined" &&
    typeof navigator !== "undefined" &&
    navigator.product === "ReactNative";
  if (!isNative) {
    throw new Error("You can only use `@optq/local-native` in React Native.");
  }

  class OptqNativeDatabase implements OptqDatabase {
    private constructor(
      public readonly database: OPSQLiteConnection,
      public readonly name: string,
    ) {}

    static getVersion(database: OPSQLiteConnection): number {
      database.execute(
        "CREATE TABLE IF NOT EXISTS metadata(id INTEGER PRIMARY KEY, version INTEGER NOT NULL, apiVersion INTEGER);",
      );
      return (
        database.execute("SELECT version FROM metadata LIMIT 1;").rows?._array?.[0]?.version ?? 0
      );
    }

    async getMetadata() {
      this.database.execute(
        "CREATE TABLE IF NOT EXISTS metadata(id INTEGER PRIMARY KEY, version INTEGER NOT NULL, apiVersion INTEGER);",
      );
      const entry = this.database.execute("SELECT version, apiVersion FROM metadata LIMIT 1;").rows
        ?._array?.[0];
      return { version: entry?.version ?? 0, apiVersion: entry?.apiVersion ?? undefined };
    }

    setMetadata(metadata: { version: number; apiVersion?: number }) {
      this.database.execute(
        "INSERT INTO metadata (id, version, apiVersion) VALUES (0, ?, ?) ON CONFLICT (id) DO UPDATE SET version=excluded.version, apiVersion=excluded.apiVersion;",
        [metadata.version, metadata.apiVersion ?? null],
      );
    }

    static new(name = "optq", location?: string) {
      const database = open({ name, location });

      let version = OptqNativeDatabase.getVersion(database);

      if (version < 1) {
        database.execute(
          "CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY, apiId TEXT NOT NULL, params JSON, headers JSON, body JSON, respondedAt INT, waitingNetwork BOOLEAN, affectedPredictions JSON);",
        );
        database.execute(
          "CREATE TABLE IF NOT EXISTS caches(resId TEXT NOT NULL, hash TEXT NOT NULL, value JSON, respondedAt INT NOT NULL, PRIMARY KEY (resId, hash));",
        );
        database.execute(
          "CREATE TABLE IF NOT EXISTS predictions(resId TEXT NOT NULL, hash TEXT NOT NULL, value JSON, PRIMARY KEY (resId, hash));",
        );

        version = 1;
      }

      if (version !== OPTQ_DATABASE_VERSION) {
        throw new Error(
          `The database version (${version}) is not compatible with the current version (${OPTQ_DATABASE_VERSION}).`,
        );
      }

      const nativeDatabase = new OptqNativeDatabase(database, name);
      nativeDatabase.setMetadata({ version });

      return nativeDatabase;
    }

    async getAllRequests() {
      const requests = this.database.execute("SELECT * FROM requests;").rows?._array ?? [];
      return requests.map(({ params, headers, body, affectedPredictions, ...request }) => ({
        params: params ? JSON.parse(params) : undefined,
        headers: headers ? JSON.parse(headers) : undefined,
        body: body ? JSON.parse(body) : undefined,
        affectedPredictions: affectedPredictions ? JSON.parse(affectedPredictions) : undefined,
        ...request,
      }));
    }

    async getAllCaches() {
      const caches = this.database.execute("SELECT * FROM caches;").rows?._array ?? [];
      return caches.map(({ value, ...cache }) => ({
        value: value ? JSON.parse(value) : undefined,
        ...cache,
      }));
    }

    async getAllPredictions() {
      const predictions = this.database.execute("SELECT * FROM predictions;").rows?._array ?? [];
      return predictions.map(({ value, ...prediction }) => ({
        value: value ? JSON.parse(value) : undefined,
        ...prediction,
      }));
    }

    deleteRequest({ id }: { id: string }) {
      this.database.execute("DELETE FROM requests WHERE id = ?;", [id]);
    }

    deleteCache({ resId, hash }: { resId: string; hash: string }) {
      this.database.execute("DELETE FROM caches WHERE resId = ? AND hash = ?;", [resId, hash]);
    }

    deletePrediction({ resId, hash }: { resId: string; hash: string }) {
      this.database.execute("DELETE FROM predictions WHERE resId = ? AND hash = ?;", [resId, hash]);
    }

    upsertRequest({
      id,
      apiId,
      params,
      headers,
      body,
      respondedAt,
      waitingNetwork,
      affectedPredictions,
    }: OptqSchema["requests"]["value"]) {
      this.database.execute(
        "INSERT OR REPLACE INTO requests (id, apiId, params, headers, body, respondedAt, waitingNetwork, affectedPredictions) VALUES (?, ?, ?, ?, ?, ?, ?, ?);",
        [
          id,
          apiId,
          JSON.stringify(params),
          JSON.stringify(headers),
          body ? JSON.stringify(body) : undefined,
          respondedAt,
          waitingNetwork,
          affectedPredictions ? JSON.stringify(affectedPredictions) : undefined,
        ],
      );
    }
    upsertCache({ resId, hash, value, respondedAt }: OptqSchema["caches"]["value"]) {
      this.database.execute(
        "INSERT INTO caches (resId, hash, value, respondedAt) VALUES (?, ?, ?, ?) ON CONFLICT (resId, hash) DO UPDATE SET value=excluded.value,respondedAt=excluded.respondedAt;",
        [resId, hash, JSON.stringify(value), respondedAt],
      );
    }
    upsertPrediction({ resId, hash, value }: OptqSchema["predictions"]["value"]) {
      this.database.execute(
        "INSERT INTO predictions (resId, hash, value) VALUES (?, ?, ?) ON CONFLICT (resId, hash) DO UPDATE SET value=excluded.value;",
        [resId, hash, JSON.stringify(value)],
      );
    }
  }

  const database = OptqNativeDatabase.new(databaseName);
  await installOptqLocalDatabaseHelper(optq, database);

  return database;
}
