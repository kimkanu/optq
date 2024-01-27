import { describe, expect, test } from "vitest";
import SuperJSON from "superjson";
import objectHash from "object-hash";

import { createOptq } from "./lib.js";
import type { OptqApiType, OptqConfig } from "./types.js";

function clone<T>(x: T): T {
  return SuperJSON.parse(SuperJSON.stringify(x));
}

describe("Simple test cases", () => {
  type Api = OptqApiType<{
    responseHeaders: {
      "x-responded-at": string;
    };
    "GET /users/:userId/version": {
      params: {
        userId: string;
      };
      data: number;
    };
    "POST /users/:userId/version/increase": {
      params: {
        userId: string;
      };
      body: {
        increaseBy: number;
      };
      data: number;
    };
  }>;
  const optqConfig: OptqConfig<Api> = {
    respondedAt({ headers }) {
      return BigInt(headers["x-responded-at"]);
    },
    routes: {
      "GET /users/:userId/version": {
        hash: ({ userId }) => userId,
        defaultValue: 1,
      },
      "POST /users/:userId/version/increase": {
        actions({ params: { userId }, body, set }) {
          set(
            "/users/:userId/version",
            { userId },
            (prev) => (prev ?? 1) + (body?.increaseBy ?? 1),
          );
        },
        onResponse({ set, ok, status, data, params: { userId }, removeRequest }) {
          if (ok) {
            set("/users/:userId/version", { userId }, data);
          } else if (status === 401) {
            return removeRequest();
          }
        },
      },
    },
  };

  test("Basic defaultValue, get, and set", () => {
    const opt = createOptq(optqConfig);

    // The default value is 1
    expect(opt.get("/users/:userId/version", { userId: "my-user" })).toBe(1);

    // Set the value to 2 at time 0n
    opt.set("/users/:userId/version", { userId: "my-user" }, 2, 0n);
    expect(opt.get("/users/:userId/version", { userId: "my-user" })).toBe(2);

    // Set the value to 2024 at time 1010n
    opt.set("/users/:userId/version", { userId: "my-user" }, 2024, 1010n);
    expect(opt.get("/users/:userId/version", { userId: "my-user" })).toBe(2024);

    // Set the value to 101010 at time 1000n, which is older than the previous value
    // Therefore, the value is not updated
    opt.set("/users/:userId/version", { userId: "my-user" }, 101010, 1000n);
    expect(opt.get("/users/:userId/version", { userId: "my-user" })).toBe(2024);
  });

  test("opt.mutate (Success)", async () => {
    const opt = createOptq(optqConfig);
    expect(opt.get("/users/:userId/version", { userId: "my-user" })).toBe(1);

    // The cache data is not set yet
    expect<
      | {
          value: number;
          respondedAt: number | bigint;
        }
      | undefined
    >(opt.cacheStore["/users/:userId/version"]?.["my-user"]).toBe(undefined);
    expect<number | undefined>(opt.predictionStore["/users/:userId/version"]?.["my-user"]).toBe(
      undefined,
    );

    // The request is sent
    const promise = opt.mutate(
      {
        id: "request-1",
        apiId: "POST /users/:userId/version/increase",
        params: { userId: "my-user" },
        headers: { "x-user-credential": "correct" },
        body: { increaseBy: 2024 },
      },
      // @ts-expect-error: test environment
      async () => {
        return {
          status: 200,
          ok: true,
          headers: { "x-responded-at": "2024" },
          data: 2025,
        };
      },
      100,
    );

    // The cache data is not set yet, but the prediction is computed
    expect<
      | {
          value: number;
          respondedAt: number | bigint;
        }
      | undefined
    >(opt.cacheStore["/users/:userId/version"]?.["my-user"]).toBe(undefined);
    expect(opt.predictionStore["/users/:userId/version"]!["my-user"]).toBe(2025);

    // The request is stored in the requestStore
    expect(clone(opt.requestStore)).toEqual([
      {
        id: "request-1",
        apiId: "POST /users/:userId/version/increase",
        params: { userId: "my-user" },
        headers: { "x-user-credential": "correct" },
        body: { increaseBy: 2024 },
        affectedPredictions: [["/users/:userId/version", "my-user"]],
        waitingNetwork: false,
      },
    ]);

    // Wait for the request to be processed
    await promise;

    // The cache data is set
    expect(opt.cacheStore["/users/:userId/version"]!["my-user"].value).toBe(2025);
    expect(opt.cacheStore["/users/:userId/version"]!["my-user"].respondedAt).toBe(2024n);

    // The request is removed from the requestStore
    // because every action it creates is not newer than corresponding cache data
    expect(clone(opt.requestStore)).toEqual([]);

    // Because there are no requests in the requestStore,
    // the prediction value is the same as the cache value
    expect(opt.predictionStore["/users/:userId/version"]!["my-user"]).toBe(2025);
  });

  test("opt.mutate (Unauthorized)", async () => {
    const opt = createOptq(optqConfig);
    expect(opt.get("/users/:userId/version", { userId: "my-user" })).toBe(1);

    // The cache data is not set yet
    expect<
      | {
          value: number;
          respondedAt: number | bigint;
        }
      | undefined
    >(opt.cacheStore["/users/:userId/version"]?.["my-user"]).toBe(undefined);
    expect<number | undefined>(opt.predictionStore["/users/:userId/version"]?.["my-user"]).toBe(
      undefined,
    );

    // The request is sent
    const promise = opt.mutate(
      {
        id: "request-1",
        apiId: "POST /users/:userId/version/increase",
        params: { userId: "my-user" },
        headers: { "x-user-credential": "incorrect" },
        body: { increaseBy: 126 },
      },
      // @ts-expect-error: test environment
      async () => {
        return {
          status: 401,
          ok: false,
          headers: { "x-responded-at": "2000" },
        };
      },
      100,
    );

    // The cache data is not set yet, but the prediction is computed
    expect<
      | {
          value: number;
          respondedAt: number | bigint;
        }
      | undefined
    >(opt.cacheStore["/users/:userId/version"]?.["my-user"]).toBe(undefined);
    expect(opt.predictionStore["/users/:userId/version"]!["my-user"]).toBe(127);

    // The request is stored in the requestStore
    expect(clone(opt.requestStore)).toEqual([
      {
        id: "request-1",
        apiId: "POST /users/:userId/version/increase",
        params: { userId: "my-user" },
        headers: { "x-user-credential": "incorrect" },
        body: { increaseBy: 126 },
        affectedPredictions: [["/users/:userId/version", "my-user"]],
        waitingNetwork: false,
      },
    ]);

    // Wait for the request to be processed
    await promise;

    // The cache data is not set
    expect<
      | {
          value: number;
          respondedAt: number | bigint;
        }
      | undefined
    >(opt.cacheStore["/users/:userId/version"]?.["my-user"]).toBe(undefined);

    // The request is removed from the requestStore because of `removeRequest()`
    expect(clone(opt.requestStore)).toEqual([]);

    // The prediction value is updated to be equal to the cache value by `removeRequest()`
    expect<number | undefined>(opt.predictionStore["/users/:userId/version"]?.["my-user"]).toBe(
      undefined,
    );
  });

  test("opt.mutate (error)", async () => {
    const opt = createOptq(optqConfig);
    expect(opt.get("/users/:userId/version", { userId: "my-user" })).toBe(1);

    // The cache data is not set yet
    expect<
      | {
          value: number;
          respondedAt: number | bigint;
        }
      | undefined
    >(opt.cacheStore["/users/:userId/version"]?.["my-user"]).toBe(undefined);
    expect<number | undefined>(opt.predictionStore["/users/:userId/version"]?.["my-user"]).toBe(
      undefined,
    );

    // The request is sent and failed
    const promise = opt.mutate(
      {
        id: "request-1",
        apiId: "POST /users/:userId/version/increase",
        params: { userId: "my-user" },
        headers: { "x-network": "not-available" },
        body: { increaseBy: 126 },
      },
      // @ts-expect-error: test environment
      async () => {
        throw Error("Network is not available");
      },
      100,
    );

    // The cache data is not set yet, but the prediction is computed
    expect<
      | {
          value: number;
          respondedAt: number | bigint;
        }
      | undefined
    >(opt.cacheStore["/users/:userId/version"]?.["my-user"]).toBe(undefined);
    expect(opt.predictionStore["/users/:userId/version"]!["my-user"]).toBe(127);

    // The request is stored in the requestStore
    expect(clone(opt.requestStore)).toEqual([
      {
        id: "request-1",
        apiId: "POST /users/:userId/version/increase",
        params: { userId: "my-user" },
        headers: { "x-network": "not-available" },
        body: { increaseBy: 126 },
        affectedPredictions: [["/users/:userId/version", "my-user"]],
        waitingNetwork: false,
      },
    ]);

    // Wait for the request to be processed
    try {
      await promise;
      expect.unreachable("The promise should be rejected");
    } catch (error) {
      expect((error as { message?: string }).message).toBe("Network is not available");

      // Same thing happens as the previous test (Unauthorized)
      expect<
        | {
            value: number;
            respondedAt: number | bigint;
          }
        | undefined
      >(opt.cacheStore["/users/:userId/version"]?.["my-user"]).toBe(undefined);
      expect(clone(opt.requestStore)).toEqual([]);
      expect<number | undefined>(opt.predictionStore["/users/:userId/version"]?.["my-user"]).toBe(
        undefined,
      );
    }
  });
});

describe("Complex flows", () => {
  type Api = OptqApiType<{
    responseHeaders: {
      "x-responded-at": string;
    };
    "GET /count": {
      data: number;
    };
    "POST /increase": {
      data: { count: number };
    };
  }>;

  const optqConfig: OptqConfig<Api> = {
    respondedAt({ headers }) {
      return BigInt(headers["x-responded-at"]);
    },
    routes: {
      "GET /count": { defaultValue: 0 },
      "POST /increase": {
        actions({ set }) {
          set("/count", {}, (prev) => (prev ?? 0) + 1);
        },
        onResponse({ set, ok, data, removeRequest }) {
          if (ok) {
            set("/count", {}, data.count);
          } else {
            return removeRequest();
          }
        },
      },
    },
  };

  /**
   * ![Refer to iamge](docs/images/req-order-differs-resp-order.png)
   */
  const flow1 = test("Req order != Resp order", async () => {
    const opt = createOptq(optqConfig);

    expect(opt.get("/count")).toBe(0);

    const promises = [
      opt.mutate(
        { id: "request-1", apiId: "POST /increase" },
        // @ts-expect-error: test environment
        async () => ({
          status: 200,
          ok: true,
          headers: { "x-responded-at": "3" },
          data: { count: 3 },
        }),
        300,
      ),
      opt.mutate(
        { id: "request-2", apiId: "POST /increase" },
        // @ts-expect-error: test environment
        async () => ({
          status: 200,
          ok: true,
          headers: { "x-responded-at": "1" },
          data: { count: 1 },
        }),
        200,
      ),
      opt.mutate(
        { id: "request-3", apiId: "POST /increase" },
        // @ts-expect-error: test environment
        async () => ({
          status: 200,
          ok: true,
          headers: { "x-responded-at": "2" },
          data: { count: 2 },
        }),
        100,
      ),
    ];

    expect<number | undefined>(opt.cacheStore["/count"]?.[objectHash({})]?.value).toBe(undefined);
    expect(opt.requestStore.length).toBe(3);
    expect(opt.get("/count")).toBe(3);

    await promises[2];
    expect(opt.cacheStore["/count"]?.[objectHash({})]?.value).toBe(2);
    expect(opt.requestStore.length).toBe(2);
    expect(opt.get("/count")).toBe(4); // wrong!

    await promises[1];
    expect(opt.cacheStore["/count"]?.[objectHash({})]?.value).toBe(2);
    expect(opt.requestStore.length).toBe(1);
    expect(opt.get("/count")).toBe(3); // correct

    await promises[0];
    expect(opt.cacheStore["/count"]?.[objectHash({})]?.value).toBe(3);
    expect(opt.requestStore.length).toBe(0);
    expect(opt.get("/count")).toBe(3); // correct
  });

  /**
   * ![Refer to iamge](docs/images/error-handling.png)
   */
  const flow2 = test("Error Handling", async () => {
    const opt = createOptq(optqConfig);

    expect(opt.get("/count")).toBe(0);

    const promises = [
      opt.mutate(
        { id: "request-1", apiId: "POST /increase" },
        // @ts-expect-error: test environment
        async () => ({
          status: 400,
          ok: false,
          headers: { "x-responded-at": "1" },
        }),
        100,
      ),
      opt.mutate(
        { id: "request-2", apiId: "POST /increase" },
        // @ts-expect-error: test environment
        async () => ({
          status: 200,
          ok: true,
          headers: { "x-responded-at": "3" },
          data: { count: 1 },
        }),
        200,
      ),
      opt.mutate(
        { id: "request-3", apiId: "POST /increase" },
        // @ts-expect-error: test environment
        async () => ({
          status: 400,
          ok: false,
          headers: { "x-responded-at": "2" },
        }),
        300,
      ),
    ];

    expect<number | undefined>(opt.cacheStore["/count"]?.[objectHash({})]?.value).toBe(undefined);
    expect(opt.requestStore.length).toBe(3);
    expect(opt.get("/count")).toBe(3);

    await promises[0];
    expect<number | undefined>(opt.cacheStore["/count"]?.[objectHash({})]?.value).toBe(undefined);
    expect(opt.requestStore.length).toBe(2);
    expect(opt.get("/count")).toBe(2);

    await promises[1];
    expect(opt.cacheStore["/count"]?.[objectHash({})]?.value).toBe(1);
    expect(opt.requestStore.length).toBe(1);
    expect(opt.get("/count")).toBe(2);

    await promises[2];
    expect(opt.cacheStore["/count"]?.[objectHash({})]?.value).toBe(1);
    expect(opt.requestStore.length).toBe(0);
    expect(opt.get("/count")).toBe(1); // correct
  });
});
