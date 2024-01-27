import type { Optq, OptqApiBase } from "@optq/core";
import { openDB, type DBSchema } from "idb";
import SuperJSON from "superjson";
import { subscribe } from "valtio/vanilla";

const CURRENT_VERSION = 1;

interface OptqDB extends DBSchema {
  requests: {
    key: string;
    value: {
      id: string;
      apiId: string;
      params: unknown;
      headers: unknown;
      body: unknown;
      respondedAt?: number | string; // string for bigint
      waitingNetwork?: boolean;
      affectedPredictions?: [string, string][];
    };
  };
  caches: {
    key: number;
    value: {
      resId: string;
      hash: string;
      value: unknown;
      respondedAt: number | string; // string for bigint
    };
    indexes: { "resId, hash": [string, string] };
  };
  predictions: {
    key: number;
    value: {
      resId: string;
      hash: string;
      value: unknown;
    };
    indexes: { "resId, hash": [string, string] };
  };
}

export default async function installOptqLocalDatabase<Api extends OptqApiBase<Api>>(
  optq: Optq<Api>,
) {
  if (!("indexedDB" in window)) {
    console.error("This browser doesn't support IndexedDB");
    return;
  }

  const database = await openDB<OptqDB>("optq", CURRENT_VERSION, {
    upgrade(database, oldVersion) {
      let version = oldVersion;

      if (version < 1) {
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

  await database.getAll("requests").then(async (requests) => {
    for (const { respondedAt, ...request } of requests) {
      try {
        // @ts-ignore
        optq.requestStore.push({
          ...request,
          respondedAt: typeof respondedAt === "string" ? BigInt(respondedAt) : respondedAt,
        });
      } catch (e) {
        console.error(e);
      }
    }
  });
  await database.getAll("predictions").then(async (predictions) => {
    for (const { resId, hash, value } of predictions) {
      try {
        // @ts-ignore
        optq.predictionStore[resId] ??= {};
        // @ts-ignore
        optq.predictionStore[resId]![hash] = SuperJSON.deserialize(value);
      } catch (e) {
        console.error(e);
      }
    }
  });
  await database.getAll("caches").then(async (caches) => {
    for (const { resId, hash, value, respondedAt } of caches) {
      try {
        // @ts-ignore
        optq.cacheStore[resId] ??= {};
        // @ts-ignore
        optq.cacheStore[resId]![hash] = {
          // @ts-ignore
          value: SuperJSON.deserialize(value),
          respondedAt: typeof respondedAt === "string" ? BigInt(respondedAt) : respondedAt,
        };
      } catch (e) {
        console.error(e);
      }
    }
  });

  subscribe(optq.requestStore, async (ops) => {
    const tx = database.transaction("requests", "readwrite");
    const store = tx.objectStore("requests");

    for (const op of ops) {
      try {
        if (op[0] === "delete") {
          const { id } = op[2] as { id: string };
          await store.delete(id);
        } else if (op[0] === "set" && op[1].length === 1 && op[1][0] !== "length" && op[3]) {
          const { id } = op[3] as { id: string };
          await store.delete(id);
        }
      } catch (e) {
        console.error(e);
      }
    }

    for (const request of optq.requestStore) {
      try {
        const {
          id,
          apiId,
          params,
          headers,
          body,
          respondedAt,
          waitingNetwork,
          affectedPredictions,
        } = SuperJSON.deserialize<(typeof optq.requestStore)[number]>(SuperJSON.serialize(request));

        if (!waitingNetwork) continue;

        await store.put(
          {
            id,
            apiId,
            params,
            headers,
            body,
            waitingNetwork,
            affectedPredictions,
            respondedAt: typeof respondedAt === "bigint" ? respondedAt.toString() : respondedAt,
          },
          id,
        );
      } catch (e) {
        console.error(e);
      }
    }

    await tx.done;
  });
  subscribe(optq.predictionStore, async (ops) => {
    const tx = database.transaction("predictions", "readwrite");
    const store = tx.objectStore("predictions");
    for (const op of ops) {
      try {
        if (op[0] !== "set") continue;

        const [, path, value] = op;
        if (path.length !== 2) continue;

        const [resId, hash] = path as [string, string];

        const entry = await store.index("resId, hash").getKey([resId, hash]);
        await store.put({ resId, hash, value: SuperJSON.serialize(value) }, entry);
      } catch (e) {
        console.error(e);
      }
    }
    await tx.done;
  });
  subscribe(optq.cacheStore, async (ops) => {
    const tx = database.transaction("caches", "readwrite");
    const store = tx.objectStore("caches");
    for (const op of ops) {
      try {
        if (op[0] !== "set") continue;

        // @ts-ignore
        const [, path, { value, respondedAt }] = op;
        if (path.length !== 2) continue;

        const [resId, hash] = path as [string, string];

        const entry = await store.index("resId, hash").getKey([resId, hash]);
        await store.put(
          {
            resId,
            hash,
            value: SuperJSON.serialize(value),
            respondedAt: typeof respondedAt === "bigint" ? respondedAt.toString() : respondedAt,
          },
          entry,
        );
      } catch (e) {
        console.error(e);
      }
    }
    await tx.done;
  });

  return database;
}
