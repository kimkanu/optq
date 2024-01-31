import type { Optq } from "@optq/core";
export default function installOptqLocalDatabase<Api extends {
    OPTQ_VALIDATED: true;
}>(optq: Optq<Api>, databaseName?: string): Promise<void>;
