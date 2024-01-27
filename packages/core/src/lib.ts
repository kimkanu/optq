import { QueryClient, onlineManager, focusManager } from "@tanstack/query-core";
import { nanoid } from "nanoid";
import objectHash from "object-hash";
import { proxy } from "valtio/vanilla";

import { getDefaultRespondedAt, getGetterInner, internalFetch } from "./internal.js";
import type {
  Method,
  Optq,
  OptqAdditionalApiTypeKeys,
  OptqApiBase,
  OptqCacheStore,
  OptqConfig,
  OptqGetter,
  OptqMutationRouteConfig,
  OptqMutator,
  OptqParams,
  OptqPredictionStore,
  OptqRequest,
  OptqRequestStore,
  OptqResourceData,
  OptqResourceId,
  OptqResourceRouteConfig,
  OptqResponse,
  OptqSetter,
  PendingResponseResult,
} from "./types.js";

export function createOptq<Api extends OptqApiBase<Api>>(config: OptqConfig<Api>): Optq<Api> {
  const queryClient = config?.queryClient ?? new QueryClient();

  const requestStore = proxy<OptqRequestStore<Api>>([]);
  const cacheStore = proxy<OptqCacheStore<Api>>({});
  const predictionStore = proxy<OptqPredictionStore<Api>>({});

  const set = getSetter({ config, requestStore, cacheStore, predictionStore });
  const get = getGetter({ config, predictionStore });
  const mutate = getMutator({ config, requestStore, cacheStore, predictionStore, set });

  const becameOnline = new Promise<void>((resolve) => {
    if (onlineManager.isOnline()) return resolve();
    const unsubscribe = onlineManager.subscribe((isOnline) => {
      if (isOnline) {
        unsubscribe();
        resolve();
      }
    });
  });

  const pendingResponses = becameOnline.then(async () => {
    if (config?.resumeRequestMode === "sequential") {
      const responses: PendingResponseResult<Api>[] = [];
      for (const request of requestStore) {
        if (!request.waitingNetwork) continue;
        request.waitingNetwork = false;
        try {
          // @ts-ignore: giving up to type this
          const response = (await mutate(request)) as Res;
          responses.push({ status: "fulfilled", value: { request, response } });
        } catch (e) {
          responses.push({ status: "rejected", value: { request }, reason: e });
        }
      }
      return responses;
    }

    return await Promise.all(
      requestStore
        .filter((request) => request.waitingNetwork)
        .map(async (request): Promise<PendingResponseResult<Api>> => {
          request.waitingNetwork = false;
          try {
            // @ts-ignore: giving up to type this
            const response = (await mutate(request)) as Res;
            return { status: "fulfilled", value: { request, response } };
          } catch (e) {
            return { status: "rejected", value: { request }, reason: e };
          }
        }),
    );
  });

  focusManager.setEventListener((handleFocus_) => {
    const handleFocus = () => handleFocus_();

    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("visibilitychange", handleFocus, false);
      window.addEventListener("focus", handleFocus, false);

      return () => {
        window.removeEventListener("visibilitychange", handleFocus);
        window.removeEventListener("focus", handleFocus);
      };
    }
  });

  const optq: Optq<Api> = {
    config,
    queryClient,
    requestStore,
    cacheStore,
    predictionStore,
    set,
    get,
    mutate,
    pendingResponses,
  };

  return optq;
}

function getSetter<Api extends OptqApiBase<Api>>(optq: {
  config: OptqConfig<Api>;
  requestStore: OptqRequestStore<Api>;
  cacheStore: OptqCacheStore<Api>;
  predictionStore: OptqPredictionStore<Api>;
}): OptqSetter<Api> {
  return <ResId extends OptqResourceId<Api>>(
    resourceId: ResId & keyof OptqCacheStore<Api>,
    params: OptqParams<Api, `GET ${ResId}` & Exclude<keyof Api, OptqAdditionalApiTypeKeys>>,
    value: OptqResourceData<Api, ResId>,
    respondedAt: number | bigint,
  ) => {
    type ApiId = `GET ${ResId}` & Exclude<keyof Api, OptqAdditionalApiTypeKeys>;
    const apiId = `GET ${resourceId}` as ApiId;

    const route = optq.config?.routes?.[apiId];
    const hashFn = (route?.hash ?? objectHash) as (params: OptqParams<Api, ApiId>) => string;
    const hash = hashFn(params);

    // If the cache is strictly newer (larger respondedAt) than the response,
    // do not update the cache
    const prevRespondedAt = optq.cacheStore[resourceId]?.[hash]?.respondedAt;
    if (prevRespondedAt === undefined || prevRespondedAt <= respondedAt) {
      optq.cacheStore[resourceId] = optq.cacheStore[resourceId] ?? {};

      // @ts-expect-error: temporary empty object
      optq.cacheStore[resourceId][hash] ??= {};
      // @ts-ignore: silly typescript
      optq.cacheStore[resourceId]![hash].value = value;
      optq.cacheStore[resourceId]![hash].respondedAt = respondedAt;
    }

    // @ts-ignore: silly typescript
    invalidatePrediction(optq, resourceId, hash, hashFn);
  };
}

function getGetter<Api extends OptqApiBase<Api>>(optq: {
  config: OptqConfig<Api>;
  predictionStore: OptqPredictionStore<Api>;
}): OptqGetter<Api> {
  const get = getGetterInner<Api>(optq);
  // @ts-ignore: giving up to type this
  return <ResId extends OptqResourceId<Api>>(
    resourceId: ResId,
    params: Parameters<OptqGetter<Api>>[1],
  ) => {
    // @ts-ignore: silly typescript
    return get<ResId>(optq.predictionStore, resourceId, params);
  };
}

function getMutator<Api extends OptqApiBase<Api>>(optq: {
  config: OptqConfig<Api>;
  requestStore: OptqRequestStore<Api>;
  cacheStore: OptqCacheStore<Api>;
  predictionStore: OptqPredictionStore<Api>;
  set: OptqSetter<Api>;
}): OptqMutator<Api> {
  // @ts-ignore
  return async function <
    ApiId extends Exclude<keyof Api, OptqAdditionalApiTypeKeys> &
      `${Exclude<Method, "GET">} ${string}`,
  >({
    id = nanoid(),
    apiId,
    params,
    headers,
    body,
  }: Omit<OptqRequest<Api, ApiId>, "id"> & { id?: string }) {
    type M = ApiId extends `${infer M extends Exclude<Method, "GET">} ${string}` ? M : never;
    type Res = OptqResponse<Api, ApiId & `${M} ${string}`> & {
      status: number;
      ok: boolean;
      data?: unknown;
    };

    let CREATE_DEBUG_RESPONSE = undefined;
    let DEBUG_DELAY = 100;

    // biome-ignore lint/style/noArguments: use of `arguments` is required
    if (arguments.length > 1) {
      if (
        "env" in import.meta &&
        (import.meta as ImportMeta & { env: Record<string, string> }).env.NODE_ENV !== "test"
      ) {
        throw new Error("Arguments other than the first one are only allowed in test environment.");
      }

      // biome-ignore lint/style/noArguments: use of `arguments` is required
      CREATE_DEBUG_RESPONSE = arguments[1] as () => Promise<Res>;

      // biome-ignore lint/style/noArguments: use of `arguments` is required
      DEBUG_DELAY = arguments[2] ?? 100;
    }

    const route = optq.config?.routes?.[apiId] as
      | OptqMutationRouteConfig<Api, M, ApiId & `${M} ${string}`>
      | undefined;
    const request = { id, apiId, params, headers, body };

    const affectedPredictions: [string, string][] = [];
    const markAffectedPredictions = <ResId extends OptqResourceId<Api>>(
      resourceId: ResId,
      params: OptqParams<Api, `GET ${ResId}` & Exclude<keyof Api, OptqAdditionalApiTypeKeys>>,
    ) => {
      type ApiId = `GET ${ResId}` & Exclude<keyof Api, OptqAdditionalApiTypeKeys>;
      const apiId = `GET ${resourceId}` as ApiId;

      const route = optq.config?.routes?.[apiId] as
        | OptqResourceRouteConfig<Api, ApiId, ResId>
        | undefined;
      const hashFn = route?.hash ?? objectHash;
      // @ts-ignore: silly typescript
      const hash = hashFn(params ?? {});

      for (const [otherResourceId, otherHash] of affectedPredictions) {
        if (resourceId === otherResourceId && hash === otherHash) return;
      }

      affectedPredictions.push([resourceId, hash]);
    };

    if (!optq.requestStore.some((request) => request.id === id)) {
      // @ts-ignore: giving up to type this
      optq.requestStore.push({
        ...request,
        waitingNetwork: !onlineManager.isOnline(),
        affectedPredictions,
      });
      // @ts-ignore: giving up to type this
      route?.actions?.({ ...request, set: markAffectedPredictions });

      for (const [resourceId, hash] of affectedPredictions) {
        // @ts-ignore: giving up to type this
        invalidatePrediction(optq, resourceId, hash);
      }
    }

    const method = apiId.slice(0, apiId.indexOf(" ")) as M;
    const promise = CREATE_DEBUG_RESPONSE
      ? new Promise<void>((r) => setTimeout(() => r(), DEBUG_DELAY)).then(CREATE_DEBUG_RESPONSE)
      : new Promise<void>((r) => {
          if (onlineManager.isOnline()) return r();
          const unsubscribe = onlineManager.subscribe((isOnline) => {
            if (isOnline) {
              unsubscribe();
              r();
              const requestIndex = optq.requestStore.findIndex((request) => request.id === id);
              if (requestIndex >= 0) {
                optq.requestStore[requestIndex].waitingNetwork = false;
              }
            }
          });
        }).then(
          () =>
            internalFetch({
              baseUrl: optq.config?.baseUrl ?? "",
              method,
              path: apiId.slice(method.length + 1),
              // @ts-ignore
              params,
              // @ts-ignore
              headers,
              body,
            }) as unknown as Promise<Res>,
        );

    return promise
      .then((response) => {
        const respondedAt =
          route?.respondedAt?.(response) ??
          // @ts-ignore: giving up to type this
          optq.config?.respondedAt?.(response) ??
          // @ts-ignore: giving up to type this
          getDefaultRespondedAt(response);

        const requestIndex = optq.requestStore.findIndex((request) => request.id === id);
        if (requestIndex >= 0) {
          optq.requestStore[requestIndex].respondedAt = respondedAt;
        }

        // @ts-ignore: giving up to type this
        route?.onResponse?.({
          respondedAt,
          params,
          status: response.status,
          ok: response.ok,
          headers: response.headers,
          data: response.data,
          // @ts-ignore: giving up to type this
          set: (r, p, d) => optq.set(r, p, d, respondedAt),
          request,
          removeRequest() {
            const requestIndex = optq.requestStore.findIndex((request) => request.id === id);
            if (requestIndex >= 0) {
              const [req] = optq.requestStore.splice(requestIndex, 1);
              for (const [resourceId, hash] of req.affectedPredictions ?? []) {
                invalidatePrediction(optq, resourceId, hash);
              }
            }
          },
        });

        return {
          ...response,
          respondedAt,
        };
      })
      .catch((error) => {
        // Remove the request from the requestStore
        const requestIndex = optq.requestStore.findIndex((request) => request.id === id);
        if (requestIndex >= 0) {
          const [req] = optq.requestStore.splice(requestIndex, 1);
          for (const [resourceId, hash] of req.affectedPredictions ?? []) {
            invalidatePrediction(optq, resourceId, hash);
          }
        }

        throw error;
      });
  };
}

function invalidatePrediction<Api extends OptqApiBase<Api>, ResId extends OptqResourceId<Api>>(
  optq: {
    config: OptqConfig<Api>;
    requestStore: OptqRequestStore<Api>;
    cacheStore: OptqCacheStore<Api>;
    predictionStore: OptqPredictionStore<Api>;
  },
  resourceId: ResId & keyof OptqCacheStore<Api>,
  hash: string,
  hashFn_?: (
    params: OptqParams<Api, `GET ${ResId}` & Exclude<keyof Api, OptqAdditionalApiTypeKeys>>,
  ) => string,
) {
  type ApiId = `GET ${ResId}` & Exclude<keyof Api, OptqAdditionalApiTypeKeys>;
  const apiId = `GET ${resourceId}` as ApiId;

  let hashFn = hashFn_;
  if (!hashFn) {
    const route = optq.config.routes?.[apiId];
    // @ts-ignore: silly typescript
    hashFn = route?.hash ?? objectHash;
  }

  optq.predictionStore[resourceId] ??= {};
  // @ts-ignore: silly typescript
  optq.predictionStore[resourceId][hash] = optq.cacheStore[resourceId]?.[hash]?.value;

  for (
    let i = 0, n = optq.requestStore.length, req = optq.requestStore[i];
    i < n;
    req = optq.requestStore[++i]
  ) {
    req.affectedPredictions = [];

    // Update prediction only if either `request` is not responded (`request.respondedAt === undefined`)
    //                           or `request.respondedAt` is strictly newer (larger) than `cache.respondedAt`
    const set = <OtherResId extends OptqResourceId<Api>>(
      otherResourceId: OtherResId,
      params: OptqParams<Api, `GET ${OtherResId}` & Exclude<keyof Api, OptqAdditionalApiTypeKeys>>,
      update:
        | (OptqResourceData<Api, OtherResId> | undefined)
        | ((
            prev: OptqResourceData<Api, OtherResId> | undefined,
          ) => OptqResourceData<Api, OtherResId> | undefined),
    ) => {
      // Check if we are setting the prediction for the same resource
      if (
        (otherResourceId as OptqResourceId<Api>) !== resourceId ||
        hash !== hashFn!(params as unknown as Parameters<Exclude<typeof hashFn, undefined>>[0])
      )
        return;

      if (
        req.respondedAt !== undefined &&
        optq.cacheStore?.[resourceId]?.[hash].respondedAt !== undefined &&
        req.respondedAt <= optq.cacheStore[resourceId]![hash].respondedAt
      ) {
        return;
      }
      const newValue =
        // @ts-ignore: giving up to type this
        typeof update === "function" ? update(optq.predictionStore[resourceId][hash]) : update;

      // @ts-ignore: silly typescript
      optq.predictionStore[resourceId][hash] = newValue;
      req.affectedPredictions!.push([resourceId, hash]);
    };
    // @ts-ignore: giving up to type this
    optq.config.routes?.[req.apiId]?.actions?.({ ...req, set });
  }

  // Remove resolved requests
  for (let i = optq.requestStore.length - 1; i >= 0; i--) {
    if (!optq.requestStore[i].affectedPredictions!.length) {
      optq.requestStore.splice(i, 1);
    }
  }
}
