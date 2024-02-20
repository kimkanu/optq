import type { QueryClient } from "@tanstack/query-core";

export namespace Util {
  export type Assert<T extends true> = T;
  export type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;
  export type Not<X> = Equals<X, false>;
  type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (
    x: infer I,
  ) => void
    ? I
    : never;
  export type IsUnion<T> = [T] extends [UnionToIntersection<T>] ? false : true;
  export type Prettify<T> = {
    [K in keyof T]: T[K];
  } & {};
  export type ValueOf<T> = T[keyof T];
  export type PickOr<T, K extends string, D = never> = K extends keyof T ? T[K] : D;
  type ExtractConcrete<T> = {
    [K in keyof T as undefined extends T[K]
      ? never
      : Equals<T[K], never> extends true
        ? never
        : K]: T[K];
  } & {};
  export type PrettifyOptional<T> = Prettify<ExtractConcrete<T> & Partial<T>>;
  export type Optional<T> = T | undefined;

  export type NormalizeHeaders<T> = Prettify<{
    [K in keyof T & string as T[K] extends string | undefined ? Lowercase<K> : never]: T[K];
  }>;
  export type ExtractPathParams<P extends string> = P extends `http${"" | "s"}://${infer Rest}`
    ? ExtractPathParams<`/${Rest}`>
    : P extends `${string}/:${infer Param}/${infer Rest}`
      ? Param | ExtractPathParams<`/${Rest}`>
      : P extends `${string}:${infer Param}`
        ? Param
        : never;
  export type ExtractPath<R> = R extends `${Http.Method} ${infer P extends string}` ? P : never; // `
}

export namespace Http {
  /**
   * Supported HTTP methods type
   */
  export type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

  /**
   * Supported HTTP ok status type
   */
  export type OkStatus = 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226;

  /**
   * Supported HTTP error status type
   */
  export type ErrorStatus =
    | 300
    | 301
    | 302
    | 303
    | 304
    | 305
    | 306
    | 307
    | 308
    | 400
    | 401
    | 402
    | 403
    | 404
    | 405
    | 406
    | 407
    | 408
    | 409
    | 410
    | 411
    | 412
    | 413
    | 414
    | 415
    | 416
    | 417
    | 418
    | 421
    | 422
    | 423
    | 424
    | 425
    | 426
    | 428
    | 429
    | 431
    | 451
    | 500
    | 501
    | 502
    | 503
    | 504
    | 505
    | 506
    | 507
    | 508
    | 510
    | 511;

  /**
   * Any headers
   */
  export type AnyHeaders = Record<string, string | undefined>;
}

/**
 * OptqApi<Api>
 */
type OptqAdditionalApiTypeKeys = "requestHeaders" | "responseHeaders" | "params" | "apiVersion";
type OptqAllowedRouteFields =
  | "params"
  | "body"
  | "requestHeaders"
  | "responseHeaders"
  | "data"
  | "resource"
  | "error";
type OptqAllowedApiTypeKeys =
  | OptqAdditionalApiTypeKeys
  | "OPTQ_VALIDATED"
  | `${Http.Method} ${string}`;

type OptqApiValidation<Api extends Record<string, unknown>> =
  // If there are disallowed keys in the API type, return an error
  Util.Equals<Exclude<keyof Api, OptqAllowedApiTypeKeys>, never> extends false
    ? {
        error: {
          [K in Exclude<keyof Api, OptqAllowedApiTypeKeys>]: "TypeError: invalid field";
        };
      }
    : // 1. If the apiVersion is not a number, return an error
      (
          "apiVersion" extends keyof Api
            ? Api["apiVersion"] extends number
              ? `${Api["apiVersion"]}` extends `${string}.${string}`
                ? true
                : false
              : true
            : false
        ) extends true
      ? {
          error: {
            apiVersion: "TypeError: apiVersion must be an integer";
          };
        }
      : // 2. If the apiVersion is not an integer literal, return an error
        (
            "apiVersion" extends keyof Api
              ? Util.IsUnion<Api["apiVersion"]> extends true
                ? true
                : Util.Equals<Api["apiVersion"], number>
              : false
          ) extends true
        ? {
            error: {
              apiVersion: "TypeError: apiVersion must be an integer literal";
            };
          }
        : // 3. Field names of requestHeaders should be in lowercase
          (
              "requestHeaders" extends keyof Api
                ? Api["requestHeaders"] extends Util.NormalizeHeaders<Api["requestHeaders"]>
                  ? false
                  : true
                : false
            ) extends true
          ? {
              error: {
                requestHeaders: {
                  [P in keyof Api["requestHeaders"] & string as Util.Not<
                    Util.Equals<P, Lowercase<P>>
                  > extends true
                    ? never
                    : P]: `TypeError: field name \`${P}\` should be in lowercase`;
                };
              };
            }
          : // 4. Field names of responseHeaders should be in lowercase
            (
                "responseHeaders" extends keyof Api
                  ? Api["responseHeaders"] extends Util.NormalizeHeaders<Api["responseHeaders"]>
                    ? false
                    : true
                  : false
              ) extends true
            ? {
                error: {
                  responseHeaders: {
                    [P in keyof Api["responseHeaders"] & string as Util.Not<
                      Util.Equals<P, Lowercase<P>>
                    > extends true
                      ? never
                      : P]: `TypeError: field name \`${P}\` should be in lowercase`;
                  };
                };
              }
            : // 5. Check if params key extends string or number
              (
                  "params" extends keyof Api
                    ? keyof Api["params"] extends string | number
                      ? false
                      : true
                    : false
                ) extends true
              ? {
                  error: {
                    params: {
                      [P in Exclude<
                        keyof Api["params"],
                        string | number
                      >]: "TypeError: parameter name is not a string or a number";
                    };
                  };
                }
              : // 6. Check if params value extends string | number | bigint | boolean | undefined | null
                (
                    "params" extends keyof Api
                      ? Api["params"] extends Record<
                          string,
                          string | number | bigint | boolean | undefined | null
                        >
                        ? false
                        : true
                      : false
                  ) extends true
                ? {
                    error: {
                      params: {
                        [P in keyof Api["params"] as Api["params"][P] extends
                          | string
                          | number
                          | bigint
                          | boolean
                          | undefined
                          | null
                          ? never
                          : P]: "TypeError: value does not extend `string | number | bigint | boolean | undefined | null`";
                      };
                    };
                  }
                : // 7. general routes
                  Util.Equals<RoutesError<Api>, {}> extends false
                  ? { error: RoutesError<Api> }
                  : // 8. GET routes
                    Util.Equals<GetRoutesError<Api>, {}> extends false
                    ? { error: GetRoutesError<Api> }
                    : // 9. DELETE routes
                      Util.Equals<DeleteRoutesError<Api>, {}> extends false
                      ? { error: DeleteRoutesError<Api> }
                      : // 10. Mutation routes
                        Util.Equals<MutationRoutesError<Api>, {}> extends false
                        ? { error: MutationRoutesError<Api> }
                        : Api;

export type OptqApi<
  Api extends Record<string, unknown> &
    // For auto-completion of field names (global config)
    Partial<Record<OptqAdditionalApiTypeKeys, unknown>> &
    ("error" extends keyof OptqApiValidation<Api> ? OptqApiValidation<Api>["error"] : unknown),
> = OptqApiValidation<Api> &
  ("error" extends keyof OptqApiValidation<Api> ? unknown : { OPTQ_VALIDATED: true });

// 7. general routes
type Routes<Api> = Exclude<keyof Api & string, OptqAdditionalApiTypeKeys | "OPTQ_VALIDATED">;
export type RoutesError<Api> = Util.Prettify<{
  [R in Routes<Api> as Util.Equals<RouteError<Api, R>, never> extends true ? never : R]: RouteError<
    Api,
    R
  >;
}>;
type RouteError<Api, R extends Routes<Api>> = ( // 1. path params should be exhaustive
  Util.Equals<Util.ExtractPathParams<R>, never> extends true
    ? false
    : "params" extends keyof Api[R]
      ? Util.ExtractPathParams<R> extends keyof Api[R]["params"]
        ? false
        : true
      : true
) extends true
  ? {
      params: {
        [P in Exclude<
          Util.ExtractPathParams<R>,
          "params" extends keyof Api[R] ? keyof Api[R]["params"] : never
        >]: `TypeError: missing parameter \`${P}\``;
      };
    }
  : // 2. Check if params key extends string or number
    (
        "params" extends keyof Api[R]
          ? keyof Api[R]["params"] extends string | number
            ? false
            : true
          : false
      ) extends true
    ? {
        params: {
          [P in Exclude<
            "params" extends keyof Api[R] ? keyof Api[R]["params"] : never,
            string | number
          >]: "TypeError: parameter name is not a string or a number";
        };
      }
    : // 3. Check if params value extends string | number | bigint | boolean | undefined | null
      (
          "params" extends keyof Api[R]
            ? Api[R]["params"] extends Record<
                string,
                string | number | bigint | boolean | undefined | null
              >
              ? false
              : true
            : false
        ) extends true
      ? {
          params: {
            [P in "params" extends keyof Api[R] ? keyof Api[R]["params"] : never as (
              "params" extends keyof Api[R]
                ? keyof Api[R]["params"][P]
                : never
            ) extends string | number | bigint | boolean | undefined | null
              ? never
              : P]: "TypeError: value does not extend `string | number | bigint | boolean | undefined | null`";
          };
        }
      : // 4. Field names of requestHeaders should be in lowercase
        (
            "requestHeaders" extends keyof Api[R]
              ? Api[R]["requestHeaders"] extends Util.NormalizeHeaders<Api[R]["requestHeaders"]>
                ? false
                : true
              : false
          ) extends true
        ? {
            requestHeaders: {
              [P in ("requestHeaders" extends keyof Api[R]
                ? keyof Api[R]["requestHeaders"]
                : never) &
                string as Util.Not<Util.Equals<P, Lowercase<P>>> extends true
                ? never
                : P]: `TypeError: field name \`${P}\` should be in lowercase`;
            };
          }
        : // 5. Field names of responseHeaders should be in lowercase
          (
              "responseHeaders" extends keyof Api[R]
                ? Api[R]["responseHeaders"] extends Util.NormalizeHeaders<Api[R]["responseHeaders"]>
                  ? false
                  : true
                : false
            ) extends true
          ? {
              responseHeaders: {
                [P in ("responseHeaders" extends keyof Api[R]
                  ? keyof Api[R]["responseHeaders"]
                  : never) &
                  string as Util.Not<Util.Equals<P, Lowercase<P>>> extends true
                  ? never
                  : P]: `TypeError: field name \`${P}\` should be in lowercase`;
              };
            }
          : // 6. error status should be of type Http.ErrorStatus
            (
                "error" extends keyof Api[R]
                  ? Api[R]["error"] extends { status: Http.ErrorStatus }
                    ? false
                    : true
                  : false
              ) extends true
            ? {
                error: "TypeError: error status should be of type Http.ErrorStatus";
              }
            : // 7. fields other than params, body, requestHeaders, responseHeaders, data, resource, error are not allowed
              (keyof Api[R] extends OptqAllowedRouteFields ? true : false) extends false
              ? {
                  [K in Exclude<
                    keyof Api[R],
                    OptqAllowedRouteFields
                  >]: "TypeError: fields other than params, body, requestHeaders, responseHeaders, data, resource, error are not allowed";
                }
              : never;

// 8. GET routes
export type GetRoutes<Api> = Routes<Api> & `GET ${string}`;
type GetRoutesError<Api> = Util.Prettify<{
  [G in GetRoutes<Api> as Util.Equals<GetRouteError<Api, G>, never> extends true
    ? never
    : G]: GetRouteError<Api, G>;
}>;
type GetRouteError<Api, G extends GetRoutes<Api>> = ( // 1. data should be defined
  "data" extends keyof Api[G]
    ? true
    : false
) extends false
  ? { data: "TypeError: data is missing" }
  : // 2. body should not be defined
    "body" extends keyof Api[G]
    ? { body: "TypeError: body should not be defined in GET routes" }
    : never;

// 9. DELETE routes
type DeleteRoutes<Api> = Routes<Api> & `DELETE ${string}`;
type DeleteRoutesError<Api> = Util.Prettify<{
  [D in DeleteRoutes<Api> as Util.Equals<DeleteRouteError<Api, D>, never> extends true
    ? never
    : D]: DeleteRouteError<Api, D>;
}>;
type DeleteRouteError<Api, D extends DeleteRoutes<Api>> = "body" extends keyof Api[D] // 1. body should not be defined
  ? { body: "TypeError: body should not be defined in DELETE routes" }
  : never;

// 10. Mutation routes (POST, PUT, PATCH, DELETE)
export type MutationRoutes<Api> = Routes<Api> & `${Exclude<Http.Method, "GET">} ${string}`;
type MutationRoutesError<Api> = Util.Prettify<{
  [M in MutationRoutes<Api> as Util.Equals<MutationRouteError<Api, M>, never> extends true
    ? never
    : M]: MutationRouteError<Api, M>;
}>;
type MutationRouteError<Api, D extends MutationRoutes<Api>> = "resource" extends keyof Api[D] // 1. resource should not be defined
  ? { resource: "TypeError: resource should not be defined in POST, PUT, PATCH, DELETE routes" }
  : never;

/**
 * OptqConfig<Api>
 */
export type OptqConfig<
  Api extends Record<string, unknown> & Partial<Record<OptqAdditionalApiTypeKeys, unknown>>,
> = {
  __type?: Api;

  /**
   * TanStack Query client
   */
  queryClient?: QueryClient;

  /**
   * Base URL for all requests
   * @default "/"
   */
  baseUrl?: string;

  /**
   * Whether to resume requests pending due to network conditions in parallel or sequentially
   * @default "parallel"
   */
  resumeRequestMode?: "parallel" | "sequential";

  /**
   * Global function to get server responded time from a response
   * @param response Optq response object
   */
  respondedAt?: (response: {
    headers: Util.PickOr<Api, "responseHeaders", Http.AnyHeaders>;
  }) => bigint;

  routes:
    | Util.PrettifyOptional<
        {
          [G in GetRoutes<Api>]:
            | OptqGetRouteConfig<Api, G>
            | (Util.Equals<
                Util.PickOr<Api[G], "resource", Util.PickOr<Api[G], "data", never>>,
                Util.PickOr<Api[G], "data", never>
              > extends true
                ? undefined
                : never);
        } & {
          [R in MutationRoutes<Api>]?: OptqMutationRouteConfig<Api, R>;
        }
      >
    | (Util.Equals<OptqRoutesWithResourceType<Api, GetRoutes<Api>>, never> extends true
        ? undefined
        : never);
} & ("apiVersion" extends keyof Api ? { apiVersion: Api["apiVersion"] } : {});

type OptqRoutesWithResourceType<Api, G extends GetRoutes<Api>> = G extends unknown
  ? "resource" extends keyof Api[G]
    ? Api[G]["resource"]
    : never
  : never;

type OptqRouteConfig<Api, R extends Routes<Api>> = {
  respondedAt?: (response: OptqResponse<Api, R>) => bigint;

  hash?: "params" extends keyof Api[R]
    ? (params: Util.PickOr<Api[R], "params", {}>) => string
    : never;

  onError?: <E extends unknown>(error: E) => unknown;
};

export type OptqGetRouteConfig<Api, G extends GetRoutes<Api>> = OptqRouteConfig<Api, G> & {
  defaultValue?:
    | Util.Optional<
        Exclude<Util.PickOr<Api[G], "resource", Util.PickOr<Api[G], "data", never>>, Function>
      >
    | ("params" extends keyof Api[G]
        ? (
            params: Util.PickOr<Api[G], "params", never>,
          ) => Util.Optional<
            Exclude<Util.PickOr<Api[G], "resource", Util.PickOr<Api[G], "data", never>>, Function>
          >
        : never);

  onResponse?: (
    response: Util.Prettify<
      OptqResponse<Api, G> & {
        params: Util.PickOr<Api[G], "params", never>;
        request: {
          headers: OptqRequestHeaders<Api, G>;
        };
        respondedAt: bigint;
      }
    >,
  ) => unknown;
} & {
  [Transform in "transform" as Util.Equals<
    Util.PickOr<Api[G], "resource", Util.PickOr<Api[G], "data", never>>,
    Util.PickOr<Api[G], "data", never>
  > extends true
    ? never
    : "transform"]: (
    response: Util.Prettify<
      OptqResponse<Api, G> & {
        ok: true;
        params: Util.PickOr<Api[G], "params", never>;
        request: { headers: OptqRequestHeaders<Api, G> };
        respondedAt: bigint;
      }
    >,
  ) => Util.PickOr<Api[G], "resource", never>;
};

type OptqRequestDistribute<Api, S extends MutationRoutes<Api>> = S extends MutationRoutes<Api>
  ? OptqRequest<Api, S>
  : never;

export type OptqMutationRouteConfig<Api, R extends MutationRoutes<Api>> = OptqRouteConfig<
  Api,
  R
> & {
  actions?: (
    request: Util.Prettify<
      OptqRequest<Api, R> & {
        respondedAt?: bigint;
        waitingNetwork?: boolean;
        affectedPredictions?: [Util.ExtractPath<GetRoutes<Api>>, string][];
        set: <G extends GetRoutes<Api>>(
          otherResourceId: Util.ExtractPath<G>,
          params: Util.PickOr<Api[G], "params", {} | null | undefined>,
          update:
            | Util.Optional<Util.PickOr<Api[G], "resource", Util.PickOr<Api[G], "data", never>>>
            | ((
                prev: Util.Optional<
                  Util.PickOr<Api[G], "resource", Util.PickOr<Api[G], "data", never>>
                >,
              ) => Util.Optional<
                Util.PickOr<Api[G], "resource", Util.PickOr<Api[G], "data", never>>
              >),
        ) => void;
        removeOfflineRequests: (
          predicate: (request: OptqRequestDistribute<Api, MutationRoutes<Api>>) => boolean,
        ) => void;
      }
    >,
  ) => void;

  onResponse?: (
    response: Util.Prettify<
      OptqResponse<Api, R> & {
        params: Util.PickOr<Api[R], "params", never>;
        request: Util.Prettify<
          {
            id: string;
            headers: OptqRequestHeaders<Api, R>;
          } & {
            [Body in "body" as R extends `${"DELETE"} ${string}` ? never : Body]: Util.PickOr<
              Api[R],
              "body",
              never
            >;
          }
        >;
        respondedAt: bigint;
        set: <G extends GetRoutes<Api>>(
          resourceId: Util.ExtractPath<G>,
          params: Util.PickOr<Api[G], "params", {} | null | undefined>,
          value: Util.PickOr<Api[G], "resource", Util.PickOr<Api[G], "data", never>>,
        ) => void;
        removeRequest: () => void;
        invalidatePrediction: <G extends GetRoutes<Api>>(
          resourceId: Util.ExtractPath<G>,
          ...params: OptqGetterOptionalParam<Api & { OPTQ_VALIDATED: true }, G>
        ) => void;
      }
    >,
  ) => unknown;
};

export type OptqRequestHeaders<Api, R extends Routes<Api>> = Util.PickOr<
  Api[R],
  "requestHeaders",
  Http.AnyHeaders
> &
  Util.PickOr<Api, "requestHeaders", unknown>;

export type OptqResponseHeaders<Api, R extends Routes<Api>> = Util.PickOr<
  Api[R],
  "responseHeaders",
  Http.AnyHeaders
> &
  Util.PickOr<Api, "responseHeaders", Http.AnyHeaders>;

export type OptqRequest<Api, R extends Routes<Api>> = Util.PrettifyOptional<{
  id: string;
  apiId: R;
  params: Util.PickOr<Api[R], "params", undefined>;
  headers: [
    Util.PickOr<Api[R], "requestHeaders", undefined>,
    Util.PickOr<Api, "requestHeaders", undefined>,
  ] extends [undefined, undefined]
    ? OptqRequestHeaders<Api, R> | undefined
    : OptqRequestHeaders<Api, R>;
  body: Util.PickOr<Api[R], "body", undefined>;
}>;

export type OptqResponse<Api, R extends Routes<Api>> = Util.Prettify<
  | {
      status: Http.OkStatus;
      ok: true;
      headers: OptqResponseHeaders<Api, R>;
      data: Util.PickOr<Api[R], "data", undefined>;
    }
  | ({
      headers: Util.PickOr<Api, "responseHeaders", never>;
    } & ("error" extends keyof Api[R]
      ? Api[R]["error"] extends {
          status: Http.ErrorStatus;
          headers?: Http.AnyHeaders;
          data?: unknown;
        }
        ? Util.Prettify<
            Api[R]["error"] & {
              ok: false;
              headers: Http.AnyHeaders;
              data?: unknown;
            }
          >
        : never
      : {
          ok: false;
          status: Http.ErrorStatus;
          headers?: Http.AnyHeaders;
          data?: unknown;
        }))
>;

/**
 * Optq instance type, returned by `createOptq` function
 */
export type Optq<Api extends { OPTQ_VALIDATED: true }> = {
  config: OptqConfig<Api>;
  queryClient: QueryClient;
  requestStore: OptqRequestStore<Api>;
  cacheStore: OptqCacheStore<Api>;
  predictionStore: OptqPredictionStore<Api>;
  set: OptqSetter<Api>;
  get: OptqGetter<Api>;
  fetch: OptqFetcher<Api>;
  mutate: OptqMutator<Api>;
  pendingResponses: Promise<PendingResponseResult<Api>[]>;
};

export type OptqRequestStore<Api extends { OPTQ_VALIDATED: true }> = OptqRequestStoreDistribute<
  Api,
  MutationRoutes<Api>
>[];
export type OptqRequestStoreDistribute<
  Api extends { OPTQ_VALIDATED: true } & Record<string, unknown>,
  R extends MutationRoutes<Api>,
> = R extends unknown
  ? Util.Prettify<
      OptqRequest<Api, R> & {
        respondedAt?: bigint;
        waitingNetwork?: boolean;
        affectedPredictions?: [Util.ExtractPath<GetRoutes<Api>>, string][];
      }
    >
  : never;

export type OptqCacheStore<Api extends { OPTQ_VALIDATED: true }> = {
  [G in GetRoutes<Api> as Util.ExtractPath<G>]?: // `
    | {
        [hash: string]:
          | {
              value: Util.PickOr<Api[G], "resource", Util.PickOr<Api[G], "data", never>>;
              respondedAt: bigint;
            }
          | undefined;
      }
    | undefined;
};

export type OptqPredictionStore<Api extends { OPTQ_VALIDATED: true }> = {
  [G in GetRoutes<Api> as G extends `GET ${infer P extends string}` ? P : never]?: // `
    | {
        [hash: string]:
          | Util.PickOr<Api[G], "resource", Util.PickOr<Api[G], "data", never>>
          | undefined;
      }
    | undefined;
};

export type OptqSetter<Api extends { OPTQ_VALIDATED: true }> = <G extends GetRoutes<Api>>(
  resourceId: Util.ExtractPath<G>,
  params: Util.PickOr<Api[G], "params", {} | null | undefined>,
  value: Util.PickOr<Api[G], "resource", Util.PickOr<Api[G], "data", never>>,
  respondedAt: bigint,
) => void;

export type OptqGetterOptionalParam<
  Api extends { OPTQ_VALIDATED: true },
  G extends GetRoutes<Api>,
> = Util.Equals<Util.PickOr<Api[G], "params", {}>, {}> extends true
  ? [params?: undefined]
  : [params: Util.PickOr<Api[G], "params", never>];
export type OptqGetter<Api extends { OPTQ_VALIDATED: true }> = <G extends GetRoutes<Api>>(
  resourceId: Util.ExtractPath<G>,
  ...optionalParams: OptqGetterOptionalParam<Api, G>
) => Util.PickOr<Api[G], "resource", Util.PickOr<Api[G], "data", never>> | undefined;

export type OptqFetcherOptionalParams<
  Api extends { OPTQ_VALIDATED: true },
  G extends GetRoutes<Api>,
> = Util.Equals<Util.PickOr<Api[G], "params", {}>, {}> extends true
  ? {} extends Util.PickOr<Api[G], "requestHeaders", Http.AnyHeaders>
    ?
        | [params?: {} | undefined | null]
        | [params: {} | undefined | null, headers: OptqRequestHeaders<Api, G>]
    : [params: {} | undefined | null, headers: OptqRequestHeaders<Api, G>]
  : {} extends Util.PickOr<Api[G], "requestHeaders", Http.AnyHeaders>
    ? [params: Util.PickOr<Api[G], "params", never>, headers?: OptqRequestHeaders<Api, G>]
    : [params: Util.PickOr<Api[G], "params", never>, headers: OptqRequestHeaders<Api, G>];

export type OptqFetcher<Api extends { OPTQ_VALIDATED: true }> = <G extends GetRoutes<Api>>(
  resourceId: Util.ExtractPath<G>,
  ...optionalParams: OptqFetcherOptionalParams<Api, G>
) => Promise<OptqResponse<Api, G>>;

export type OptqMutator<Api extends { OPTQ_VALIDATED: true }> = <R extends MutationRoutes<Api>>(
  req: Omit<OptqRequest<Api, R>, "id"> & { id?: string },
) => Promise<OptqResponse<Api, R>>;

export type PendingResponseResult<Api extends { OPTQ_VALIDATED: true }> =
  | {
      status: "fulfilled";
      value: {
        request: OptqRequestStore<Api>[number];
        response: OptqResponse<Api, Routes<Api>>;
      };
    }
  | {
      status: "rejected";
      value: { request: OptqRequestStore<Api>[number] };
      reason: unknown;
    };
