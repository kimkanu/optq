import type { Optq, OptqCacheStore, OptqConfig, OptqGetter, OptqFetcher, OptqMutator, OptqPredictionStore, OptqRequestStore, OptqSetter } from "./types.js";
export declare function createOptq<Api extends {
    OPTQ_VALIDATED: true;
}>(config: OptqConfig<Api>): Optq<Api>;
export declare function getSetter<Api extends {
    OPTQ_VALIDATED: true;
}>(optq: {
    config: OptqConfig<Api>;
    requestStore: OptqRequestStore<Api>;
    cacheStore: OptqCacheStore<Api>;
    predictionStore: OptqPredictionStore<Api>;
}): OptqSetter<Api>;
export declare function getGetter<Api extends {
    OPTQ_VALIDATED: true;
}>(optq: {
    config: OptqConfig<Api>;
    predictionStore: OptqPredictionStore<Api>;
}): OptqGetter<Api>;
export declare function getFetcher<Api extends {
    OPTQ_VALIDATED: true;
}>(optq: {
    config: OptqConfig<Api>;
    set: OptqSetter<Api>;
}): OptqFetcher<Api>;
export declare function getMutator<Api extends {
    OPTQ_VALIDATED: true;
}>(optq: {
    config: OptqConfig<Api>;
    requestStore: OptqRequestStore<Api>;
    cacheStore: OptqCacheStore<Api>;
    predictionStore: OptqPredictionStore<Api>;
    set: OptqSetter<Api>;
}): OptqMutator<Api>;
