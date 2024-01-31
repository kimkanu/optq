import type { Optq } from "@optq/core";
import type { OptqDatabase } from "./types.js";
export declare const OPTQ_DATABASE_VERSION = 1;
export declare function installOptqLocalDatabaseHelper<Api extends {
    OPTQ_VALIDATED: true;
}>(optq: Optq<Api>, database: OptqDatabase): Promise<OptqDatabase>;
