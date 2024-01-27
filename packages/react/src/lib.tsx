import type {
  Optq,
  OptqAdditionalApiTypeKeys,
  OptqApiBase,
  OptqGetResponse,
  OptqParams,
  OptqPredictionStore,
  OptqRequestHeaders,
  OptqResourceData,
  OptqResourceId,
  OptqResponseHeaders,
} from "@optq/core";
import {
  QueryClientProvider,
  useQuery,
  UseQueryResult,
  type UseQueryOptions,
} from "@tanstack/react-query";
import objectHash from "object-hash";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { subscribe, useSnapshot } from "valtio";

import { getDefaultRespondedAt, getGetterInner, internalFetch } from "./internal.js";

export type OptqRequestStats = {
  completed: number;
  offline: number;
  pending: number;
  total: number;
  ratio: number;
};

type UseOptqQueryArgument<Api extends OptqApiBase<Api>, ResId extends OptqResourceId<Api>> = {
  resourceId: ResId;
  headers?: OptqRequestHeaders<Api, `GET ${ResId}` & Exclude<keyof Api, OptqAdditionalApiTypeKeys>>;
} & PrettifyOptional<{
  params: EmptyToUndefined<
    OptqParams<Api, `GET ${ResId}` & Exclude<keyof Api, OptqAdditionalApiTypeKeys>>
  >;
}> &
  Omit<UseQueryOptions, "queryKey" | "queryFn">;

export type UseOptq<Api extends OptqApiBase<Api>> = Optq<Api> & {
  useOptqQuery: <ResId extends OptqResourceId<Api>>(
    // @ts-ignore
    arg: UseOptqQueryArgument<Api, ResId>,
  ) => UseQueryResult<OptqResourceData<Api, ResId>> & {
    // @ts-ignore
    last: OptqGetResponse<Api, ResId>;
  };
};

const OptqContext = createContext(undefined);

export function OptqProvider<Api extends OptqApiBase<Api>>({
  children,
  value,
}: {
  children?: React.ReactNode;
  value: Optq<Api>;
}) {
  return (
    // @ts-ignore
    <OptqContext.Provider value={value}>
      <QueryClientProvider client={value.queryClient}>{children}</QueryClientProvider>
    </OptqContext.Provider>
  );
}

export function useOptq<Api extends OptqApiBase<Api>>(): UseOptq<Api> {
  const optq = useContext(OptqContext) as unknown as Optq<Api>;
  if (!optq) {
    throw new Error("Missing OptqProvider");
  }

  const useOptqQuery = useCallback(
    <ResId extends OptqResourceId<Api>>({
      resourceId,
      params,
      headers,
      ...options
      // @ts-ignore
    }: UseOptqQueryArgument<Api, ResId>) => {
      type ApiId = `GET ${ResId}` & Exclude<keyof Api, OptqAdditionalApiTypeKeys>;
      const apiId = `GET ${resourceId}` as ApiId;

      const route = optq.config.routes?.[apiId];
      const hashFn = route?.hash ?? objectHash;
      const get = getGetterInner(optq);

      const { data: last, ...rest } = useQuery({
        // @ts-ignore
        queryKey: [resourceId, hashFn(params ?? {})],
        queryFn: async () => {
          const response = await internalFetch<
            OptqResourceData<Api, ResId>,
            OptqResponseHeaders<Api, ApiId>
          >({
            baseUrl: optq.config?.baseUrl ?? "",
            method: "GET",
            path: resourceId,
            // @ts-ignore
            params,
            // @ts-ignore
            headers,
          });
          if (response.ok) {
            const respondedAt =
              // @ts-ignore
              route?.respondedAt?.(response) ??
              optq.config?.respondedAt?.(response) ??
              // @ts-ignore
              getDefaultRespondedAt(response);
            // @ts-ignore
            optq.set(resourceId, params, response.data!, respondedAt);
          }
          return response;
        },
        ...options,
      });

      const predictionSnapshot = useSnapshot(optq.predictionStore);

      const data = useMemo(() => {
        // @ts-ignore
        return get(predictionSnapshot as OptqPredictionStore<Api>, resourceId, params);
      }, [get, predictionSnapshot, resourceId, params]);

      return { data, last, ...rest };
    },
    [optq],
  );

  return {
    ...optq,
    // @ts-ignore
    useQuery: useOptqQuery,
  };
}

export function useOptqRequestStats<Api extends OptqApiBase<Api>>(
  optq: Pick<Optq<Api>, "requestStore">,
  options: { debounce: number } = { debounce: 1000 },
) {
  const [requestStats, setRequestStats] = useState<OptqRequestStats>({
    completed: 0,
    offline: 0,
    pending: 0,
    total: 0,
    ratio: 0,
  });
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    return subscribe(optq.requestStore, (ops) => {
      if (optq.requestStore.length === 0) {
        timeout = setTimeout(() => {
          setRequestStats({
            completed: 0,
            offline: 0,
            pending: 0,
            total: 0,
            ratio: 1,
          });
        }, options.debounce);
      } else {
        clearTimeout(timeout);
      }

      const lengthIncrementOp = ops.find(
        (op) =>
          op[0] === "set" && op[1].length === 1 && op[1][0] !== "length" && op[3] === undefined,
      );
      if (lengthIncrementOp) {
        setRequestStats((s) => {
          const newTotal = Math.max(s.total + 1, optq.requestStore.length);
          const pending = optq.requestStore.filter(
            (x) => !x.waitingNetwork && x.respondedAt === undefined,
          ).length;
          const offline = optq.requestStore.filter(
            (x) => x.waitingNetwork && x.respondedAt === undefined,
          ).length;

          return {
            completed: newTotal - pending - offline,
            offline,
            pending,
            total: newTotal,
            ratio: (newTotal - pending - offline) / newTotal,
          };
        });
      } else {
        setRequestStats((s) => {
          const pending = optq.requestStore.filter(
            (x) => !x.waitingNetwork && x.respondedAt === undefined,
          ).length;
          const offline = optq.requestStore.filter(
            (x) => x.waitingNetwork && x.respondedAt === undefined,
          ).length;

          return {
            completed: s.total - pending - offline,
            offline,
            pending,
            total: s.total,
            ratio: (s.total - pending - offline) / s.total,
          };
        });
      }
    });
  }, [optq.requestStore, options.debounce]);

  return requestStats;
}

// biome-ignore lint/complexity/noBannedTypes: Empty object type is needed here
type EmptyObject = {};
type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
  ? true
  : false;
type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
type ExtractConcrete<T> = {
  [K in keyof T as undefined extends T[K]
    ? never
    : Equals<T[K], never> extends true
      ? never
      : K]: T[K];
} & {};

type EmptyToUndefined<T> = Equals<T, EmptyObject> extends true ? undefined : T;
type PrettifyOptional<T> = Prettify<ExtractConcrete<T> & Partial<T>>;
