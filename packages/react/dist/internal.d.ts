import type { Method, OptqAdditionalApiTypeKeys, OptqApiBase, OptqConfig, OptqParams, OptqPredictionStore, OptqResourceData, OptqResourceId } from "@optq/core";
export declare function internalFetch<D, H>({ baseUrl, method, path, params, headers, body, }: {
    baseUrl: string;
    method: Method;
    path: string;
    params?: Record<string, string | number | undefined | null>;
    headers?: Record<string, string | undefined>;
    body?: unknown;
}): Promise<{
    status: number;
    ok: boolean;
    headers: H;
    data: D | undefined;
    raw: Response;
}>;
export declare function getDefaultRespondedAt(response: {
    headers: Record<string, string | undefined>;
}): number;
export declare function getGetterInner<Api extends OptqApiBase<Api>>(optq: {
    config: OptqConfig<Api>;
}): <ResId extends OptqResourceId<Api>>(store: OptqPredictionStore<Api>, resourceId: ResId, params: OptqParams<Api, `GET ${ResId}` & Exclude<keyof Api, OptqAdditionalApiTypeKeys>>) => OptqResourceData<Api, ResId> | undefined;
//# sourceMappingURL=internal.d.ts.map