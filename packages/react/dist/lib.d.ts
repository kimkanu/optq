/// <reference types="react" />
import type { Optq, OptqAdditionalApiTypeKeys, OptqApiBase, OptqGetResponse, OptqParams, OptqRequestHeaders, OptqResourceData, OptqResourceId } from "@optq/core";
import { UseQueryResult, type UseQueryOptions } from "@tanstack/react-query";
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
    params: EmptyToUndefined<OptqParams<Api, `GET ${ResId}` & Exclude<keyof Api, OptqAdditionalApiTypeKeys>>>;
}> & Omit<UseQueryOptions, "queryKey" | "queryFn">;
export type UseOptq<Api extends OptqApiBase<Api>> = Optq<Api> & {
    useOptqQuery: <ResId extends OptqResourceId<Api>>(arg: UseOptqQueryArgument<Api, ResId>) => UseQueryResult<OptqResourceData<Api, ResId>> & {
        last: OptqGetResponse<Api, ResId>;
    };
};
export declare function OptqProvider<Api extends OptqApiBase<Api>>({ children, value, }: {
    children?: React.ReactNode;
    value: Optq<Api>;
}): import("react/jsx-runtime").JSX.Element;
export declare function useOptq<Api extends OptqApiBase<Api>>(): UseOptq<Api>;
export declare function useOptqRequestStats<Api extends OptqApiBase<Api>>(optq: Pick<Optq<Api>, "requestStore">, options?: {
    debounce: number;
}): OptqRequestStats;
type EmptyObject = {};
type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
type ExtractConcrete<T> = {
    [K in keyof T as undefined extends T[K] ? never : Equals<T[K], never> extends true ? never : K]: T[K];
} & {};
type EmptyToUndefined<T> = Equals<T, EmptyObject> extends true ? undefined : T;
type PrettifyOptional<T> = Prettify<ExtractConcrete<T> & Partial<T>>;
export {};
//# sourceMappingURL=lib.d.ts.map