import type { Optq } from "@optq/core";
import SuperJSON, { type SuperJSONResult } from "superjson";
import { subscribe } from "valtio/vanilla";
import type { OptqDatabase } from "./types.js";

export const OPTQ_DATABASE_VERSION = 1;

export async function installOptqLocalDatabaseHelper<Api extends { OPTQ_VALIDATED: true }>(
  optq: Optq<Api>,
  database: OptqDatabase,
) {
  await Promise.allSettled([
    database.getAllRequests().then(async (requests) => {
      for (const { respondedAt, ...request } of requests) {
        try {
          // @ts-ignore
          optq.requestStore.push({
            ...request,
            body: SuperJSON.deserialize(request.body as SuperJSONResult),
            respondedAt: typeof respondedAt === "string" ? BigInt(respondedAt) : respondedAt,
          });
        } catch (e) {
          console.error(e);
        }
      }
    }),
    database.getAllPredictions().then(async (predictions) => {
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
    }),
    database.getAllCaches().then(async (caches) => {
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
    }),
  ]);

  const metadata = await database.getMetadata();
  const apiVersion = (optq.config as { apiVersion?: number }).apiVersion;
  if (metadata.apiVersion !== apiVersion) {
    // TODO: handle migration
    await database.setMetadata({
      version: OPTQ_DATABASE_VERSION,
      apiVersion,
    });
  }

  subscribe(optq.requestStore, async (ops) => {
    for (const op of ops) {
      try {
        if (op[0] === "delete") {
          const { id } = op[2] as { id: string };
          await database.deleteRequest({ id });
        } else if (op[0] === "set" && op[1].length === 1 && op[1][0] !== "length" && op[3]) {
          const { id } = op[3] as { id: string };
          await database.deleteRequest({ id });
        }
      } catch (e) {
        console.error(e);
      }
    }

    for (const request of optq.requestStore) {
      try {
        if (!request.waitingNetwork) continue;

        await database.upsertRequest({
          id: request.id,
          apiId: request.apiId,
          params: clone(request.params),
          headers: clone(request.headers),
          body: SuperJSON.serialize(request.body),
          waitingNetwork: request.waitingNetwork,
          affectedPredictions: clone(request.affectedPredictions),
          respondedAt: request.respondedAt?.toString(),
        });
      } catch (e) {
        console.error(e);
      }
    }
  });

  subscribe(optq.predictionStore, async (ops) => {
    for (const op of ops) {
      try {
        if (op[0] !== "set") continue;

        const [, path, value] = op;
        if (path.length !== 2) continue;

        const [resId, hash] = path as [string, string];

        await database.upsertPrediction({ resId, hash, value: SuperJSON.serialize(value) });
      } catch (e) {
        console.error(e);
      }
    }
  });

  subscribe(optq.cacheStore, async (ops) => {
    for (const op of ops) {
      try {
        if (op[0] !== "set") continue;

        // @ts-ignore
        const [, path, { value, respondedAt }] = op;
        if (path.length !== 2) continue;

        const [resId, hash] = path as [string, string];
        await database.upsertCache({
          resId,
          hash,
          value: SuperJSON.serialize(value),
          respondedAt: respondedAt.toString(),
        });
      } catch (e) {
        console.error(e);
      }
    }
  });

  return database;
}

function clone<T>(value: T): T {
  return SuperJSON.deserialize(SuperJSON.serialize(value));
}
