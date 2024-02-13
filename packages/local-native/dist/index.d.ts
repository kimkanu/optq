import type { Optq } from "@optq/core";
import { type OptqSchema } from "@optq/local";
import { type OPSQLiteConnection } from "@op-engineering/op-sqlite";
export default function installOptqLocalDatabase<Api extends {
    OPTQ_VALIDATED: true;
}>(optq: Optq<Api>, databaseName?: string): Promise<{
    readonly database: OPSQLiteConnection;
    readonly name: string;
    getMetadata(): Promise<{
        version: any;
        apiVersion: any;
    }>;
    setMetadata(metadata: {
        version: number;
        apiVersion?: number;
    }): void;
    getAllRequests(): Promise<any[]>;
    getAllCaches(): Promise<any[]>;
    getAllPredictions(): Promise<any[]>;
    deleteRequest({ id }: {
        id: string;
    }): void;
    deleteCache({ resId, hash }: {
        resId: string;
        hash: string;
    }): void;
    deletePrediction({ resId, hash }: {
        resId: string;
        hash: string;
    }): void;
    upsertRequest({ id, apiId, params, headers, body, respondedAt, waitingNetwork, affectedPredictions, }: OptqSchema["requests"]["value"]): void;
    upsertCache({ resId, hash, value, respondedAt }: OptqSchema["caches"]["value"]): void;
    upsertPrediction({ resId, hash, value }: OptqSchema["predictions"]["value"]): void;
}>;
