import type { Optq, OptqApiBase } from "@optq/core";
import { type DBSchema } from "idb";
interface OptqDB extends DBSchema {
    requests: {
        key: string;
        value: {
            id: string;
            apiId: string;
            params: unknown;
            headers: unknown;
            body: unknown;
            respondedAt?: number | string;
            waitingNetwork?: boolean;
            affectedPredictions?: [string, string][];
        };
    };
    caches: {
        key: number;
        value: {
            resId: string;
            hash: string;
            value: unknown;
            respondedAt: number | string;
        };
        indexes: {
            "resId, hash": [string, string];
        };
    };
    predictions: {
        key: number;
        value: {
            resId: string;
            hash: string;
            value: unknown;
        };
        indexes: {
            "resId, hash": [string, string];
        };
    };
}
export default function installOptqLocalDatabase<Api extends OptqApiBase<Api>>(optq: Optq<Api>): Promise<import("idb").IDBPDatabase<OptqDB> | undefined>;
export {};
//# sourceMappingURL=index.d.ts.map