// @ts-nocheck

import { QueryClient, onlineManager, focusManager } from "@tanstack/query-core";
import { nanoid } from "nanoid/non-secure";
import objectHash from "object-hash";
import { proxy } from "valtio/vanilla";
import SuperJSON from "superjson";

import type {
  Http,
  Util,
  Optq,
  OptqCacheStore,
  OptqConfig,
  OptqGetter,
  OptqFetcher,
  OptqMutator,
  OptqPredictionStore,
  OptqRequest,
  OptqRequestStore,
  OptqResponse,
  OptqSetter,
  PendingResponseResult,
  GetRoutes,
  OptqGetRouteConfig,
  OptqGetterOptionalParam,
  OptqFetcherOptionalParams,
  OptqResponseHeaders,
  OptqRequestHeaders,
  MutationRoutes,
  OptqMutationRouteConfig,
  OptqRequestStoreDistribute,
  Stringified,
} from "./types.js";

export function createOptq<Api extends { OPTQ_VALIDATED: true }>(
  config: OptqConfig<Api>,
): Optq<Api> {
  const queryClient = config.queryClient ?? new QueryClient();

  const requestStore = proxy<OptqRequestStore<Api>>([]);
  const cacheStore = proxy<OptqCacheStore<Api>>({});
  const predictionStore = proxy<OptqPredictionStore<Api>>({});

  const set = getSetter({ config, requestStore, cacheStore, predictionStore });
  const get = getGetter({ config, predictionStore });
  const fetch = getFetcher({ config, set });
  const mutate = getMutator({ config, requestStore, cacheStore, predictionStore, set });

  const becameOnline = new Promise<void>((resolve) => {
    onlineManager.subscribe((isOnline) => {
      if (isOnline) {
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
          const response = await mutate(request);
          responses.push({ status: "fulfilled", value: { request, response } });
        } catch (e) {
          responses.push({ status: "rejected", value: { request }, reason: e });
        }
      }
      return responses;
    }

    // TODO: batching?
    return await Promise.all(
      requestStore
        .filter((request) => request.waitingNetwork)
        .map(async (request, requestIndex): Promise<PendingResponseResult<Api>> => {
          request.waitingNetwork = false;
          try {
            // Give a slight delay
            const delay = requestIndex * 10;
            await new Promise((resolve) => setTimeout(resolve, delay));
            const response = await mutate(request);
            return { status: "fulfilled", value: { request, response } };
          } catch (e) {
            return { status: "rejected", value: { request }, reason: e };
          }
        }),
    );
  });

  if (typeof window !== "undefined" && window.addEventListener) {
    focusManager.setEventListener((handleFocus_) => {
      const handleFocus = () => handleFocus_();

      window.addEventListener("visibilitychange", handleFocus, false);
      window.addEventListener("focus", handleFocus, false);

      return () => {
        window.removeEventListener("visibilitychange", handleFocus);
        window.removeEventListener("focus", handleFocus);
      };
    });
  }

  const optq: Optq<Api> = {
    config,
    queryClient,
    requestStore,
    cacheStore,
    predictionStore,
    set,
    get,
    fetch,
    mutate,
    pendingResponses,
  };

  return optq;
}

export function getSetter<Api extends { OPTQ_VALIDATED: true }>(optq: {
  config: OptqConfig<Api>;
  requestStore: OptqRequestStore<Api>;
  cacheStore: OptqCacheStore<Api>;
  predictionStore: OptqPredictionStore<Api>;
}): OptqSetter<Api> {
  return <G extends GetRoutes<Api>>(
    resourceId: Util.ExtractPath<G>,
    params: Util.PickOr<Api[G], "params", {} | null | undefined>,
    value: Util.PickOr<Api[G], "resource", Util.PickOr<Api[G], "data", never>>,
    respondedAt: number | bigint,
  ) => {
    const apiId = `GET ${resourceId}` as G;
    const route = optq.config?.routes?.[apiId] as OptqGetRouteConfig<Api, G> | undefined;
    const hashFn = (route?.hash ?? objectHash) as (
      params: Util.PickOr<Api[G], "params", {}>,
    ) => string;
    const hash = hashFn((params ?? {}) as Util.PickOr<Api[G], "params", {}>);

    // If the cache is strictly newer (larger respondedAt) than the response,
    // do not update the cache
    const prevRespondedAt: number | bigint | undefined =
      optq.cacheStore[resourceId]?.[hash]?.respondedAt;
    if (prevRespondedAt === undefined || prevRespondedAt <= respondedAt) {
      optq.cacheStore[resourceId] ??= {};
      optq.cacheStore[resourceId][hash] = { value: SuperJSON.stringify(value), respondedAt };
    }

    invalidatePrediction(optq, resourceId, hash);
  };
}

export function getGetter<Api extends { OPTQ_VALIDATED: true }>(optq: {
  config: OptqConfig<Api>;
  predictionStore: OptqPredictionStore<Api>;
}): OptqGetter<Api> {
  return <G extends GetRoutes<Api>>(
    resourceId: Util.ExtractPath<G>,
    ...optionalParams: OptqGetterOptionalParam<Api, G>
  ) => {
    const [params] = optionalParams;

    const apiId = `GET ${resourceId}` as G;
    const route = optq.config.routes?.[apiId] as OptqGetRouteConfig<Api, G> | undefined;

    if (!route) return undefined;

    const hashFn = (route?.hash ?? objectHash) as (
      params: Util.PickOr<Api[G], "params", {}>,
    ) => string;
    const hash = hashFn((params ?? {}) as Util.PickOr<Api[G], "params", {}>);

    const prediction: Util.Optional<
      Util.PickOr<Api[G], "resource", Util.PickOr<Api[G], "data", never>>
    > = parse(optq.predictionStore[resourceId]?.[hash]);
    if (prediction !== undefined) return prediction;

    if (typeof route.defaultValue === "function") {
      return (
        route.defaultValue as (
          params: Util.PickOr<Api[G], "params", never>,
        ) => Util.Optional<
          Exclude<Util.PickOr<Api[G], "resource", Util.PickOr<Api[G], "data", never>>, Function>
        >
      )(params as Util.PickOr<Api[G], "params", never>);
    }
    return route.defaultValue;
  };
}

export function getFetcher<Api extends { OPTQ_VALIDATED: true }>(optq: {
  config: OptqConfig<Api>;
  set: OptqSetter<Api>;
}): OptqFetcher<Api> {
  return async <G extends GetRoutes<Api>>(
    resourceId: Util.ExtractPath<G>,
    ...optionalParams: OptqFetcherOptionalParams<Api, G>
  ) => {
    const [params, headers] = optionalParams;

    const apiId = `GET ${resourceId}` as G;
    const route = optq.config.routes?.[apiId] as Util.Optional<
      OptqGetRouteConfig<Api, G> & {
        transform?: (
          response: Util.Prettify<
            OptqResponse<Api, G> & {
              ok: true;
              params: Util.PickOr<Api[G], "params", never>;
              request: { headers: OptqRequestHeaders<Api, G> };
              respondedAt: bigint | number;
            }
          >,
        ) => Util.PickOr<Api[G], "resource", never>;
      }
    >;

    const response = (await internalFetch<
      Util.PickOr<Api[G], "data", never>,
      OptqResponseHeaders<Api, G>
    >({
      baseUrl: optq.config?.baseUrl ?? "",
      method: "GET",
      path: resourceId,
      params,
      headers,
    })) as OptqResponse<Api, G>;
    if (response.ok) {
      const respondedAt =
        route?.respondedAt?.(response) ??
        optq.config?.respondedAt?.(response) ??
        getDefaultRespondedAt(response);

      route?.onResponse?.({
        respondedAt,
        params,
        status: response.status,
        ok: response.ok,
        headers: response.headers,
        data: response.data,
        request: { headers },
      });

      const transformPayload = {
        ...response,
        params,
        request: { headers },
        respondedAt,
      } as Util.Prettify<
        OptqResponse<Api, G> & {
          ok: true;
          params: Util.PickOr<Api[G], "params", never>;
          request: { headers: OptqRequestHeaders<Api, G> };
          respondedAt: bigint | number;
        }
      >;
      const data = route?.transform?.(transformPayload) ?? response.data;
      optq.set(
        resourceId,
        params as Util.PickOr<Api[G], "params", never>,
        data as Util.PickOr<Api[G], "resource", Util.PickOr<Api[G], "data", never>>,
        respondedAt,
      );
    }
    return response;
  };
}

export function getMutator<Api extends { OPTQ_VALIDATED: true }>(optq: {
  config: OptqConfig<Api>;
  requestStore: OptqRequestStore<Api>;
  cacheStore: OptqCacheStore<Api>;
  predictionStore: OptqPredictionStore<Api>;
  set: OptqSetter<Api>;
}): OptqMutator<Api> {
  return async function <R extends MutationRoutes<Api>>({
    id = nanoid(),
    apiId,
    params,
    headers,
    body,
  }: Omit<OptqRequest<Api, R>, "id"> & { id?: string }) {
    type Res = OptqResponse<Api, R> & {
      status: number;
      ok: boolean;
      data?: unknown;
    };

    let CREATE_DEBUG_RESPONSE = undefined;
    let DEBUG_DELAY = 100;

    // biome-ignore lint/style/noArguments: use of `arguments` is required
    if (arguments.length > 1) {
      console.warn("Do not use additional arguments of `mutate` in production.");

      // biome-ignore lint/style/noArguments: use of `arguments` is required
      CREATE_DEBUG_RESPONSE = arguments[1] as () => Promise<Res>;

      // biome-ignore lint/style/noArguments: use of `arguments` is required
      DEBUG_DELAY = arguments[2] ?? 100;
    }

    const route = optq.config?.routes?.[apiId] as Util.Optional<OptqMutationRouteConfig<Api, R>>;
    const request = { id, apiId, params, headers, body };

    const affectedPredictions: [string, string][] = [];
    const markAffectedPredictions = <G extends GetRoutes<Api>>(
      resourceId: Util.ExtractPath<G>,
      params: Util.PickOr<Api[G], "params", {} | null | undefined>,
    ) => {
      const apiId = `GET ${resourceId}` as G;

      const route = optq.config?.routes?.[apiId] as Util.Optional<OptqGetRouteConfig<Api, G>>;
      const hashFn = (route?.hash ?? objectHash) as (
        params: Util.PickOr<Api[G], "params", {}>,
      ) => string;
      const hash = hashFn((params ?? {}) as Util.PickOr<Api[G], "params", {}>);

      for (const [otherResourceId, otherHash] of affectedPredictions) {
        if (resourceId === otherResourceId && hash === otherHash) return;
      }

      affectedPredictions.push([resourceId, hash]);
    };

    const removeOfflineRequests = (
      predicate: <S extends MutationRoutes<Api>>(
        request: Util.Prettify<OptqRequest<Api, S>>,
      ) => boolean,
    ) => {
      for (let i = optq.requestStore.length - 1; i >= 0; i--) {
        if (optq.requestStore[i].waitingNetwork && predicate(optq.requestStore[i])) {
          optq.requestStore.splice(i, 1);
        }
      }
    };

    if (!optq.requestStore.some((request) => request.id === id)) {
      optq.requestStore.push({
        ...request,
        waitingNetwork: !onlineManager.isOnline(),
        affectedPredictions,
      } as OptqRequestStoreDistribute<Api, R>);
      route?.actions?.({ ...request, set: markAffectedPredictions, removeOfflineRequests });

      for (const [resourceId, hash] of affectedPredictions) {
        invalidatePrediction(optq, resourceId as Util.ExtractPath<GetRoutes<Api>>, hash);
      }
    }

    const method = apiId.slice(0, apiId.indexOf(" ")) as Http.Method;
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
            internalFetch<Util.PickOr<Api[R], "data", never>, OptqResponseHeaders<Api, R>>({
              baseUrl: optq.config?.baseUrl ?? "",
              method,
              path: apiId.slice(method.length + 1),
              params,
              headers,
              body,
            }) as Promise<OptqResponse<Api, R>>,
        );

    return promise
      .then((response) => {
        const respondedAt =
          route?.respondedAt?.(response) ??
          optq.config?.respondedAt?.(response) ??
          getDefaultRespondedAt(response);

        const requestIndex = optq.requestStore.findIndex((request) => request.id === id);
        if (requestIndex >= 0) {
          optq.requestStore[requestIndex].respondedAt = respondedAt;
        }

        route?.onResponse?.({
          respondedAt,
          params,
          status: response.status,
          ok: response.ok,
          headers: response.headers,
          data: response.data,
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
          invalidatePrediction: (resourceId, params) => {
            const route = optq.config?.routes?.[`GET ${resourceId}`];
            const hashFn = route?.hash ?? objectHash;
            const hash = hashFn(params ?? {});
            invalidatePrediction(optq, resourceId, hash);
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

function invalidatePrediction<Api extends { OPTQ_VALIDATED: true }, G extends GetRoutes<Api>>(
  optq: {
    config: OptqConfig<Api>;
    requestStore: OptqRequestStore<Api>;
    cacheStore: OptqCacheStore<Api>;
    predictionStore: OptqPredictionStore<Api>;
  },
  resourceId: Util.ExtractPath<G>,
  hash: string,
) {
  const apiId = `GET ${resourceId}` as G;
  const route = optq.config.routes?.[apiId] as OptqGetRouteConfig<Api, G> | undefined;
  const hashFn = (route?.hash ?? objectHash) as (
    params: Util.PickOr<Api[G], "params", {}>,
  ) => string;

  optq.predictionStore[resourceId] ??= {};
  optq.predictionStore[resourceId][hash] = optq.cacheStore[resourceId]?.[hash]?.value;

  for (const request of optq.requestStore) {
    request.affectedPredictions =
      request.affectedPredictions?.filter(([r, h]) => r !== resourceId || h !== hash) ?? [];

    // Update prediction only if either `request` is not responded (`request.respondedAt === undefined`)
    //                           or `request.respondedAt` is strictly newer (larger) than `cache.respondedAt`
    const set = <H extends GetRoutes<Api>>(
      otherResourceId: Util.ExtractPath<H>,
      params: Util.PickOr<Api[H], "params", {} | null | undefined>,
      update:
        | Util.Optional<Util.PickOr<Api[H], "resource", Util.PickOr<Api[H], "data", never>>>
        | ((
            prev: Util.Optional<
              Util.PickOr<Api[H], "resource", Util.PickOr<Api[H], "data", never>>
            >,
          ) => Util.Optional<Util.PickOr<Api[H], "resource", Util.PickOr<Api[H], "data", never>>>),
    ) => {
      // Check if we are setting the prediction for the same resource
      function isSameResource(
        otherResourceId: Util.ExtractPath<H>,
      ): otherResourceId is Util.ExtractPath<G> & Util.ExtractPath<H> {
        return (
          (otherResourceId as unknown) === resourceId &&
          hash === hashFn((params ?? {}) as unknown as Parameters<typeof hashFn>[0])
        );
      }
      if (!isSameResource(otherResourceId)) return;

      if (
        request.respondedAt !== undefined &&
        optq.cacheStore?.[resourceId]?.[hash].respondedAt !== undefined &&
        request.respondedAt <= optq.cacheStore[resourceId]![hash].respondedAt
      ) {
        return;
      }

      type Resource = Util.Optional<
        Util.PickOr<Api[G], "resource", Util.PickOr<Api[G], "data", never>>
      >;
      type UpdateFn = (prev: Resource) => Resource;
      const newValue =
        typeof update !== "function"
          ? update
          : (update as UpdateFn)(parse(optq.predictionStore[resourceId][hash]));

      optq.predictionStore[resourceId][hash] = SuperJSON.stringify(newValue);
      if (request.affectedPredictions!.every(([r, h]) => r !== resourceId || h !== hash)) {
        request.affectedPredictions!.push([resourceId, hash]);
      }
    };
    optq.config.routes?.[request.apiId]?.actions?.({ ...request, set, removeRequests: () => {} });
  }

  // Remove resolved requests
  for (let i = optq.requestStore.length - 1; i >= 0; i--) {
    if (!optq.requestStore[i].affectedPredictions!.length) {
      optq.requestStore.splice(i, 1);
    }
  }
}

async function internalFetch<D, H>({
  baseUrl,
  method,
  path,
  params,
  headers,
  body,
}: {
  baseUrl: string;
  method: Http.Method;
  path: string;
  params?: unknown;
  headers?: unknown;
  body?: unknown;
}) {
  let url = /^https?:\/\//.test(path) ? path : baseUrl + path;
  {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value === undefined || value === null) continue;
      const regex = new RegExp(`:${key}(?=/|$)`, "g");
      if (regex.test(url)) {
        url = url.replace(regex, (value as string | number).toString());
      } else {
        searchParams.append(key, (value as string | number).toString());
      }
    }
    const stringifiedSearchParams = searchParams.toString();
    url += `${stringifiedSearchParams ? "?" : ""}${stringifiedSearchParams}`;
  }

  const isBodyJson =
    body === undefined
      ? true
      : typeof body === "object" && (body === null || body.constructor === Object);
  const isBodyText = body === undefined ? false : typeof body === "string";
  const isBodyFormData = body === undefined ? false : body instanceof FormData;

  const response = await fetch(url, {
    method,
    headers: {
      "content-type": isBodyJson
        ? "application/json"
        : isBodyText
          ? "text/plain"
          : isBodyFormData
            ? "multipart/form-data"
            : "application/octet-stream",
      ...(headers as object),
    },
    body:
      body === undefined
        ? undefined
        : isBodyJson
          ? JSON.stringify(body)
          : (body as BodyInit | null | undefined),
  });

  const contentType = response.headers.get("content-type");
  const headersObject = Object.fromEntries(response.headers.entries()) as H;

  let data: D | undefined;
  try {
    data = (
      contentType?.includes("json")
        ? await response.json()
        : contentType?.startsWith("text/")
          ? await response.text()
          : await response.arrayBuffer()
    ) as D;
  } catch {
    data = undefined;
  }

  return {
    status: response.status,
    ok: response.ok,
    headers: headersObject,
    data,
    raw: response,
  };
}

function getDefaultRespondedAt(response: { headers: any }) {
  return BigInt(new Date(response.headers.date ?? Date.now()).getTime());
}

function parse<T>(string?: Stringified<T>) {
  if (!string) return undefined;
  try {
    return SuperJSON.parse(string) as T;
  } catch {
    return undefined;
  }
}
