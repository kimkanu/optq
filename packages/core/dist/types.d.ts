import type { QueryClient } from "@tanstack/query-core";
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
export type ErrorStatus = 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308 | 400 | 401 | 402 | 403 | 404 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 421 | 422 | 423 | 424 | 425 | 426 | 428 | 429 | 431 | 451 | 500 | 501 | 502 | 503 | 504 | 505 | 506 | 507 | 508 | 510 | 511;
/**
 * Any headers
 */
export type AnyHeaders = Record<string, string | undefined>;
export type ExtractPathParams<P extends string> = P extends `${string}:${infer Param}/${infer Rest}` ? Param | ExtractPathParams<`/${Rest}`> : P extends `${string}:${infer Param}` ? Param : never;
type OptqErrorWrongApiTypeKeys<T> = ["OptqErrorWrongApiTypeKeys", T];
type OptqErrorDataMissingInGetRoute<T> = ["OptqErrorDataMissingInGetRoute", T];
/**
 * List of additional keys used in API type definition
 *
 * @example
 * ```ts
 * type Api = OptqApiType<{
 *   requestHeaders: { authorization: string };
 *   responseHeaders: { "x-responded-at": string };
 *   params: { version: number };
 *
 *   "GET /hello/:username": {
 *     params: { username: string };
 *     data: { world: string };
 *   };
 * }>
 * ```
 */
export type OptqAdditionalApiTypeKeys = "requestHeaders" | "responseHeaders" | "params";
type OptqAllowedApiTypeKeys = OptqAdditionalApiTypeKeys | `${Method} ${string}`;
export type OptqRequestHeaders<Api, ApiId extends Exclude<keyof Api, OptqAdditionalApiTypeKeys> = never> = Equals<ApiId, never> extends true ? "requestHeaders" extends keyof Api ? NormalizeHeader<Api["requestHeaders"]> : EmptyObject : "requestHeaders" extends keyof Api[ApiId] ? OptqRequestHeaders<Api> & NormalizeHeader<Api[ApiId]["requestHeaders"]> : OptqRequestHeaders<Api>;
export type OptqResponseHeaders<Api, ApiId extends Exclude<keyof Api, OptqAdditionalApiTypeKeys> = never> = Equals<ApiId, never> extends true ? "responseHeaders" extends keyof Api ? NormalizeHeader<Api["responseHeaders"]> : EmptyObject : "responseHeaders" extends keyof Api[ApiId] ? OptqResponseHeaders<Api> & NormalizeHeader<Api[ApiId]["responseHeaders"]> : OptqResponseHeaders<Api>;
export type OptqParams<Api extends OptqApiBase<Api>, ApiId extends Exclude<keyof Api, OptqAdditionalApiTypeKeys> = never> = Equals<ApiId, never> extends true ? "params" extends keyof Api ? Api["params"] : EmptyObject : "params" extends keyof Api[ApiId] ? OptqParams<Api> & Api[ApiId]["params"] : OptqParams<Api>;
export type OptqRequestBody<Api, ApiId extends Exclude<keyof Api, OptqAdditionalApiTypeKeys>> = ApiId extends `GET ${string}` ? never : "body" extends keyof Api[ApiId] ? Api[ApiId]["body"] : undefined;
export type OptqResourceData<Api extends OptqApiBase<Api>, Path extends string> = `GET ${Path}` extends keyof Api ? "data" extends keyof Api[`GET ${Path}`] ? Api[`GET ${Path}`]["data"] : never : never;
export type OptqResourceId<Api extends OptqApiBase<Api>> = OptqResourceIdDistribute<Exclude<keyof Api, OptqAdditionalApiTypeKeys> & string>;
type OptqResourceIdDistribute<ApiId extends string> = ApiId extends `GET ${infer P}` ? P : never;
export type OptqApiBase<Api> = keyof Api extends OptqAllowedApiTypeKeys ? {
    requestHeaders?: OptqRequestHeaders<Api>;
    responseHeaders?: OptqResponseHeaders<Api>;
    params?: "params" extends keyof Api ? Api["params"] : undefined;
} & {
    [K in keyof Api as K extends `${Method} ${string}` ? K : never]: K extends `${infer M extends Method} ${infer P extends string}` ? PrettifyOptional<{
        params: Equals<ExtractPathParams<P>, never> extends true ? Record<string, string | number | undefined | null> | undefined : Record<ExtractPathParams<P>, string | number | undefined | null>;
        body: M extends "GET" | "DELETE" ? undefined : unknown | undefined;
        requestHeaders?: OptqRequestHeaders<Api[K]>;
        responseHeaders?: OptqResponseHeaders<Api[K]>;
        data: M extends "GET" ? Exclude<"data" extends keyof Api[K] ? Api[K]["data"] : OptqErrorDataMissingInGetRoute<K>, undefined> : unknown;
        error?: {
            status: ErrorStatus;
            headers?: Record<string, string | undefined>;
            data?: unknown;
        };
    }> : OptqErrorWrongApiTypeKeys<K>;
} : OptqErrorWrongApiTypeKeys<Exclude<keyof Api, OptqAllowedApiTypeKeys>>;
export type OptqApiType<Api extends OptqApiBase<Api>> = Api;
export type OptqConfig<Api extends OptqApiBase<Api>> = {
    /**
     * TanStack Query client
     */
    queryClient?: QueryClient;
    /**
     * Base URL for all requests
     * @default ""
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
    respondedAt?(response: OptqResponse<Api>): bigint | number;
    routes?: {
        [K in Exclude<keyof Api, OptqAdditionalApiTypeKeys>]?: K extends `${infer M extends Method} ${infer P extends string}` & keyof Api ? M extends "GET" ? OptqResourceRouteConfig<Api, K & `GET ${P}`, P> : M extends Exclude<Method, "GET"> ? OptqMutationRouteConfig<Api, M, K> : never : never;
    };
};
export type OptqResourceRouteConfig<Api extends OptqApiBase<Api>, ApiId extends Exclude<keyof Api, OptqAdditionalApiTypeKeys> & `GET ${string}`, Path extends string> = {
    respondedAt?(response: OptqResponse<Api, ApiId>): bigint | number;
    hash?(params: OptqParams<Api, ApiId>): string;
    defaultValue?: OptqResourceData<Api, Path> | ((params: OptqParams<Api, ApiId>) => OptqResourceData<Api, Path>);
};
export type OptqMutationRouteConfig<Api extends OptqApiBase<Api>, M extends Exclude<Method, "GET">, ApiId extends Exclude<keyof Api, OptqAdditionalApiTypeKeys> & `${M} ${string}`> = {
    respondedAt?(response: OptqResponse<Api, ApiId>): bigint | number;
    actions?(requestWithSet: OptqRequest<Api, ApiId> & {
        set<ResId extends OptqResourceId<Api>>(resourceId: ResId, params: OptqParams<Api, `GET ${ResId}` & Exclude<keyof Api, OptqAdditionalApiTypeKeys>>, update: (OptqResourceData<Api, ResId> | undefined) | ((prev: OptqResourceData<Api, ResId> | undefined) => OptqResourceData<Api, ResId> | undefined)): void;
    }): void;
    onResponse?(response: OptqMutationResponse<Api, M, ApiId> & {
        params: OptqParams<Api, ApiId>;
        request: OptqRequest<Api, ApiId>;
        respondedAt: number | bigint;
        set<ResId extends OptqResourceId<Api>>(resourceId: ResId, params: OptqParams<Api, `GET ${ResId}` & Exclude<keyof Api, OptqAdditionalApiTypeKeys>>, data: OptqResourceData<Api, ResId>): void;
        removeRequest(): void;
    }): void;
};
export type OptqRequest<Api extends OptqApiBase<Api>, ApiId extends Exclude<keyof Api, OptqAdditionalApiTypeKeys> & `${Exclude<Method, "GET">} ${string}`> = {
    id: string;
    apiId: ApiId;
    params: OptqParams<Api, ApiId>;
    headers: OptqRequestHeaders<Api, ApiId>;
    body: OptqRequestBody<Api, ApiId>;
};
export type OptqResponse<Api extends OptqApiBase<Api>, ApiId extends Exclude<keyof Api, OptqAdditionalApiTypeKeys> = never> = Equals<ApiId, never> extends true ? {
    headers: OptqResponseHeaders<Api>;
} : ApiId extends `GET ${string}` ? OptqGetResponse<Api, ApiId> : ApiId extends `${infer M extends Exclude<Method, "GET">} ${string}` ? OptqMutationResponse<Api, M, ApiId> : never;
export type OptqGetResponse<Api extends OptqApiBase<Api>, ApiId extends Exclude<keyof Api, OptqAdditionalApiTypeKeys> & `GET ${string}`> = "data" extends keyof Api[ApiId] ? Prettify<{
    status: OkStatus;
    ok: true;
    headers: OptqResponseHeaders<Api, ApiId>;
    data: Api[ApiId]["data"];
} | ({
    headers: OptqResponseHeaders<Api>;
} & ("error" extends keyof Api[ApiId] ? Api[ApiId]["error"] extends {
    status: ErrorStatus;
    headers?: AnyHeaders;
    data?: unknown;
} ? Prettify<Api[ApiId]["error"] & {
    ok: false;
    headers: AnyHeaders;
    data?: unknown;
}> : never : {
    status: ErrorStatus;
    ok: false;
    headers: AnyHeaders;
    data?: unknown;
}))> : never;
export type OptqMutationResponse<Api extends OptqApiBase<Api>, M extends Exclude<Method, "GET">, ApiId extends Exclude<keyof Api, OptqAdditionalApiTypeKeys> & `${M} ${string}`> = Prettify<{
    status: OkStatus;
    ok: true;
    headers: OptqResponseHeaders<Api, ApiId>;
    data: "data" extends keyof Api[ApiId] ? Api[ApiId]["data"] : undefined;
} | ("error" extends keyof Api[ApiId] ? Api[ApiId]["error"] extends {
    status: ErrorStatus;
    headers?: AnyHeaders;
    data?: unknown;
} ? OptqMutationResponseDistributeError<Api, Api[ApiId]["error"]> : never : {
    status: ErrorStatus;
    ok: false;
    headers: AnyHeaders;
    data?: unknown;
})>;
type OptqMutationResponseDistributeError<Api, E extends {
    status: ErrorStatus;
    headers?: AnyHeaders;
    data?: unknown;
}> = E extends unknown ? {
    ok: false;
    status: E["status"];
    headers: "headers" extends keyof E ? Prettify<OptqResponseHeaders<Api> & E["headers"]> : OptqResponseHeaders<Api> & AnyHeaders;
    data: E["data"];
} : never;
export type OptqRequestStore<Api extends OptqApiBase<Api>> = OptqRequestStoreDistribute<Api, Exclude<keyof Api, OptqAdditionalApiTypeKeys> & `${Exclude<Method, "GET">} ${string}`>[];
type OptqRequestStoreDistribute<Api extends OptqApiBase<Api>, ApiId extends Exclude<keyof Api, OptqAdditionalApiTypeKeys> & `${Exclude<Method, "GET">} ${string}`> = ApiId extends unknown ? Prettify<OptqRequest<Api, ApiId> & {
    respondedAt?: number | bigint;
    waitingNetwork?: boolean;
    affectedPredictions?: [OptqResourceId<Api>, string][];
}> : never;
export type OptqCacheStore<Api extends OptqApiBase<Api>> = {
    [ResId in OptqResourceId<Api>]?: {
        [hash: string]: {
            value: OptqResourceData<Api, ResId>;
            respondedAt: number | bigint;
        };
    } | undefined;
};
export type OptqPredictionStore<Api extends OptqApiBase<Api>> = {
    [K in OptqResourceId<Api>]?: {
        [hash: string]: OptqResourceData<Api, K> | undefined;
    } | undefined;
};
type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
type ExtractConcrete<T> = {
    [K in keyof T as undefined extends T[K] ? never : Equals<T[K], never> extends true ? never : K]: T[K];
} & {};
export type PrettifyOptional<T> = Prettify<ExtractConcrete<T> & Partial<T>>;
type NormalizeHeader<H> = PrettifyOptional<{
    [K in keyof H & string as H[K] extends string | undefined ? Lowercase<K> : never]: H[K];
}>;
type EmptyObject = {};
export type EmptyToUndefined<T> = Equals<T, EmptyObject> extends true ? undefined : T;
export type OptqSetter<Api extends OptqApiBase<Api>> = <ResId extends OptqResourceId<Api>>(resourceId: ResId & keyof OptqCacheStore<Api>, params: OptqParams<Api, `GET ${ResId}` & Exclude<keyof Api, OptqAdditionalApiTypeKeys>>, value: OptqResourceData<Api, ResId>, respondedAt: number | bigint) => void;
type OptqGetterOptionalParams<Api extends OptqApiBase<Api>, ResId extends OptqResourceId<Api>> = Equals<OptqParams<Api, `GET ${ResId}` & Exclude<keyof Api, OptqAdditionalApiTypeKeys>>, EmptyObject> extends true ? [params?: OptqParams<Api, `GET ${ResId}` & Exclude<keyof Api, OptqAdditionalApiTypeKeys>>] : [params: OptqParams<Api, `GET ${ResId}` & Exclude<keyof Api, OptqAdditionalApiTypeKeys>>];
export type OptqGetter<Api extends OptqApiBase<Api>> = <ResId extends OptqResourceId<Api>>(resourceId: ResId, ...optionalParams: OptqGetterOptionalParams<Api, ResId>) => OptqResourceData<Api, ResId> | undefined;
export type OptqMutator<Api extends OptqApiBase<Api>> = <ApiId extends Exclude<keyof Api, OptqAdditionalApiTypeKeys> & `${Exclude<Method, "GET">} ${string}`>(req: Omit<OptqRequest<Api, ApiId>, "id"> & {
    id?: string;
}) => Promise<OptqResponse<Api, ApiId> & {
    status: number;
    ok: boolean;
    data?: unknown;
}>;
export type PendingResponseResult<Api extends OptqApiBase<Api>> = {
    status: "fulfilled";
    value: {
        request: OptqRequestStore<Api>[number];
        response: OptqResponse<Api, Exclude<keyof Api, OptqAdditionalApiTypeKeys>>;
    };
} | {
    status: "rejected";
    value: {
        request: OptqRequestStore<Api>[number];
    };
    reason: unknown;
};
/**
 * Optq instance type, returned by `createOptq` function
 */
export type Optq<Api extends OptqApiBase<Api>> = {
    config: OptqConfig<Api>;
    queryClient: QueryClient;
    requestStore: OptqRequestStore<Api>;
    cacheStore: OptqCacheStore<Api>;
    predictionStore: OptqPredictionStore<Api>;
    set: OptqSetter<Api>;
    get: OptqGetter<Api>;
    mutate: OptqMutator<Api>;
    pendingResponses: Promise<PendingResponseResult<Api>[]>;
};
export {};
//# sourceMappingURL=types.d.ts.map