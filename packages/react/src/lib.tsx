import {
  GetRoutes,
  Optq,
  OptqGetRouteConfig,
  OptqPredictionStore,
  OptqResponse,
  OptqTypeUtil as Util,
  getGetter,
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

export type OptqRequestStats = {
  completed: number;
  offline: number;
  pending: number;
  total: number;
  ratio: number;
};

type UseOptqQueryArgument<
  Api extends { OPTQ_VALIDATED: true },
  G extends GetRoutes<Api>,
  P extends Util.ExtractPath<G>,
> = {
  resourceId: P;
} & Util.PrettifyOptional<{
  headers: Util.PickOr<Api[G & `GET ${P}`], "requestHeaders", never> &
    Util.PickOr<Api, "requestHeaders", never>;
  params: Util.Equals<Util.PickOr<Api[G & `GET ${P}`], "params", {}>, {}> extends true
    ? undefined
    : Util.PickOr<Api[G & `GET ${P}`], "params", never>;
}> &
  Omit<UseQueryOptions, "queryKey" | "queryFn">;

export type UseOptq<Api extends { OPTQ_VALIDATED: true }> = Optq<Api> & {
  useQuery: <G extends GetRoutes<Api>, P extends Util.ExtractPath<G>>(
    arg: UseOptqQueryArgument<Api, G, P>,
  ) => UseQueryResult<
    Util.PickOr<Api[G & `GET ${P}`], "resource", Util.PickOr<Api[G & `GET ${P}`], "data", never>>
  > & {
    last: OptqResponse<Api, G & `GET ${P}`>;
  };
};

const OptqContext = createContext<any>(undefined);

export function OptqProvider<Api extends { OPTQ_VALIDATED: true }>({
  children,
  value,
}: {
  children?: React.ReactNode;
  value: Optq<Api>;
}) {
  return (
    <OptqContext.Provider value={value}>
      {/* @ts-ignore */}
      <QueryClientProvider client={value.queryClient}>{children}</QueryClientProvider>
    </OptqContext.Provider>
  );
}

export function useOptq<Api extends { OPTQ_VALIDATED: true }>(): UseOptq<Api> {
  const optq = useContext(OptqContext) as unknown as Optq<Api>;
  if (!optq) {
    throw new Error("Missing OptqProvider");
  }

  const useOptqQuery = useCallback(
    <G extends GetRoutes<Api>, P extends Util.ExtractPath<G>>({
      resourceId,
      params,
      headers,
      ...options
    }: UseOptqQueryArgument<Api, G, P>) => {
      const apiId = `GET ${resourceId}` as G;
      const route = optq.config?.routes?.[apiId] as OptqGetRouteConfig<Api, G> | undefined;
      const hashFn = (route?.hash ?? objectHash) as (
        params: Util.PickOr<Api[G], "params", {}>,
      ) => string;
      const hash = hashFn((params ?? {}) as Util.PickOr<Api[G], "params", {}>);

      const predictionSnapshot = useSnapshot(optq.predictionStore);

      const { data: last, ...rest } = useQuery({
        queryKey: [resourceId, hash],
        queryFn: () => optq.fetch<G, P>(resourceId, params as any, headers as any),
        ...options,
      });

      const get = useMemo(
        () =>
          getGetter({
            config: optq.config,
            predictionStore: predictionSnapshot as OptqPredictionStore<Api>,
          }),
        [optq, predictionSnapshot],
      );

      const data = useMemo(() => {
        return get<G, P>(resourceId, params as any);
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

export function useOptqRequestStats<Api extends { OPTQ_VALIDATED: true }>(
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
            ratio: (s.total - pending - offline) / Math.max(1, s.total),
          };
        });
      }
    });
  }, [optq.requestStore, options.debounce]);

  return requestStats;
}
