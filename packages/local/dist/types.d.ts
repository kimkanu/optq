import type { DBSchema } from "idb";
export interface OptqSchema extends DBSchema {
    requests: {
        key: string;
        value: {
            id: string;
            apiId: string;
            params: unknown;
            headers: unknown;
            body: unknown;
            respondedAt?: string;
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
            respondedAt: string;
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
export interface OptqDatabase {
    getMetadata(): Promise<{
        version: number;
        apiVersion?: number;
    }>;
    setMetadata(metadata: {
        version: number;
        apiVersion?: number;
    }): void | Promise<void>;
    getAllRequests(): Promise<OptqSchema["requests"]["value"][]>;
    getAllCaches(): Promise<OptqSchema["caches"]["value"][]>;
    getAllPredictions(): Promise<OptqSchema["predictions"]["value"][]>;
    deleteRequest(request: {
        id: string;
    }): void | Promise<void>;
    deleteCache(cache: {
        resId: string;
        hash: string;
    }): void | Promise<void>;
    deletePrediction(prediction: {
        resId: string;
        hash: string;
    }): void | Promise<void>;
    upsertRequest(request: OptqSchema["requests"]["value"]): void | Promise<void>;
    upsertCache(cache: OptqSchema["caches"]["value"]): void | Promise<void>;
    upsertPrediction(prediction: OptqSchema["predictions"]["value"]): void | Promise<void>;
}
