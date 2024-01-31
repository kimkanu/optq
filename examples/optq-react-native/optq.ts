import { createOptq, type OptqApi } from "@optq/react";
import { installFocusManager } from "@optq/react-native";
import installOptqLocalDatabase from "@optq/local-native";

export type Api = OptqApi<{
  responseHeaders: {
    "x-responded-at": string;
  };
  "GET /users/:userId/version": {
    params: {
      userId: string;
    };
    data: {
      version: number;
    };
  };
  "POST /users/:userId/version/increase": {
    params: {
      userId: string;
    };
    body: {
      increaseBy: number;
    };
    data: {
      version: number;
    };
  };
}>;

export const optq = createOptq<Api>({
  baseUrl: "/api",
  respondedAt({ headers }) {
    return BigInt(headers["x-responded-at"]);
  },
  resumeRequestMode: "parallel",
  routes: {
    "GET /users/:userId/version": {
      hash: ({ userId }) => userId,
    },
    "POST /users/:userId/version/increase": {
      actions({ params: { userId }, body, set }) {
        set("/users/:userId/version", { userId }, (prev) => ({
          version: (prev?.version ?? 1) + (body?.increaseBy ?? 1),
        }));
      },
      onResponse({ set, ok, data, params: { userId }, removeRequest }) {
        if (ok) {
          set("/users/:userId/version", { userId }, { version: data.version });
        } else {
          return removeRequest();
        }
      },
    },
  },
});

export const databaseInstallationPromise = installOptqLocalDatabase(optq).catch((e) => {});

installFocusManager();
