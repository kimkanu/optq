import installOptqLocalDatabase from "@optq/local-web";
import { createOptq, type OptqApi } from "@optq/react";

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
    resource: number;
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
  baseUrl: "http://localhost:3000/api",
  respondedAt({ headers }) {
    return BigInt(headers["x-responded-at"]);
  },
  resumeRequestMode: "parallel",
  routes: {
    "GET /users/:userId/version": {
      hash: ({ userId }) => userId,
      transform({ data }) {
        return data.version;
      },
      defaultValue: 1,
    },
    "POST /users/:userId/version/increase": {
      actions({ params: { userId }, body, set }) {
        set("/users/:userId/version", { userId }, (prev) => (prev ?? 1) + (body?.increaseBy ?? 1));
      },
      onResponse({ set, ok, data, params: { userId }, removeRequest }) {
        if (ok) {
          set("/users/:userId/version", { userId }, data.version);
        } else {
          return removeRequest();
        }
      },
    },
  },
});

export const databaseInstallationPromise = installOptqLocalDatabase(optq).catch(() => {});
