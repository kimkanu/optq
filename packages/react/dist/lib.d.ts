/// <reference types="react" />
import { GetRoutes, Optq, OptqResponse, OptqTypeUtil as Util } from "@optq/core";
import { UseQueryResult, type UseQueryOptions } from "@tanstack/react-query";
export type OptqRequestStats = {
    completed: number;
    offline: number;
    pending: number;
    total: number;
    ratio: number;
};
type UseOptqQueryArgument<Api extends {
    OPTQ_VALIDATED: true;
}, G extends GetRoutes<Api>, P extends Util.ExtractPath<G>> = {
    resourceId: P;
} & Util.PrettifyOptional<{
    headers: Util.PickOr<Api[G & `GET ${P}`], "requestHeaders", never> & Util.PickOr<Api, "requestHeaders", never>;
    params: Util.Equals<Util.PickOr<Api[G & `GET ${P}`], "params", {}>, {}> extends true ? undefined : Util.PickOr<Api[G & `GET ${P}`], "params", never>;
}> & Omit<UseQueryOptions, "queryKey" | "queryFn">;
export type UseOptq<Api extends {
    OPTQ_VALIDATED: true;
}> = Optq<Api> & {
    useQuery: <G extends GetRoutes<Api>, P extends Util.ExtractPath<G>>(arg: UseOptqQueryArgument<Api, G, P>) => UseQueryResult<Util.PickOr<Api[G & `GET ${P}`], "resource", Util.PickOr<Api[G & `GET ${P}`], "data", never>>> & {
        last: OptqResponse<Api, G & `GET ${P}`>;
    };
};
export declare function OptqProvider<Api extends {
    OPTQ_VALIDATED: true;
}>({ children, value, }: {
    children?: React.ReactNode;
    value: Optq<Api>;
}): import("react/jsx-runtime").JSX.Element;
export declare function useOptq<Api extends {
    OPTQ_VALIDATED: true;
}>(): UseOptq<Api>;
export declare function useOptqRequestStats<Api extends {
    OPTQ_VALIDATED: true;
}>(optq: Pick<Optq<Api>, "requestStore">, options?: {
    debounce: number;
}): OptqRequestStats;
export {};
