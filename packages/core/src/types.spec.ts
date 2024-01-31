import type { Optq, OptqApi, OptqConfig, Util } from "./types.js";

type TestCases = [
  Util.Assert<
    Util.Equals<
      // @ts-expect-error: apiVersion is not an integer
      OptqApi<{
        apiVersion: "1.0.0";
      }>,
      {
        error: {
          apiVersion: "TypeError: apiVersion must be an integer";
        };
      }
    >
  >,
  Util.Assert<
    Util.Equals<
      // @ts-expect-error: apiVersion is not an integer literal
      OptqApi<{
        apiVersion: 1 | 2;
      }>,
      {
        error: {
          apiVersion: "TypeError: apiVersion must be an integer literal";
        };
      }
    >
  >,
  Util.Assert<
    Util.Equals<
      // @ts-expect-error: field names of requestHeaders should be in lowercase
      OptqApi<{
        requestHeaders: {
          Authorization: string;
        };
      }>,
      {
        error: {
          requestHeaders: {
            Authorization: "TypeError: field name `Authorization` should be in lowercase";
          };
        };
      }
    >
  >,
  Util.Assert<
    Util.Equals<
      // @ts-expect-error: field names of responseHeaders should be in lowercase
      OptqApi<{
        responseHeaders: {
          "X-Provided-By": string;
        };
      }>,
      {
        error: {
          responseHeaders: {
            "X-Provided-By": "TypeError: field name `X-Provided-By` should be in lowercase";
          };
        };
      }
    >
  >,
  Util.Assert<
    Util.Equals<
      // @ts-expect-error: every key of params should be either a string or a number
      OptqApi<{
        params: {
          [Symbol.iterator]: string;
        };
      }>,
      {
        error: {
          params: {
            [Symbol.iterator]: "TypeError: parameter name is not a string or a number";
          };
        };
      }
    >
  >,
  Util.Assert<
    Util.Equals<
      // @ts-expect-error: every value of params should be string | number | bigint | boolean | undefined | null
      OptqApi<{
        params: {
          hello: VoidFunction;
        };
      }>,
      {
        error: {
          params: {
            hello: "TypeError: value does not extend `string | number | bigint | boolean | undefined | null`";
          };
        };
      }
    >
  >,
  Util.Assert<
    Util.Equals<
      // @ts-expect-error: general routes; path params should be exhaustive
      OptqApi<{
        "GET /hello/:username/:today": {
          params: {};
        };
      }>,
      {
        error: {
          "GET /hello/:username/:today": {
            params: {
              username: "TypeError: missing parameter `username`";
              today: "TypeError: missing parameter `today`";
            };
          };
        };
      }
    >
  >,
  // @ts-expect-error: general routes; every key of params should be either a string or a number
  OptqApi<{
    "GET /hello/:username": {
      params: {
        [Symbol.iterator]: string;
      };
    };
  }>,
  Util.Assert<
    Util.Equals<
      // @ts-expect-error: general routes; every value of params should be string | number | bigint | boolean | undefined | null
      OptqApi<{
        "GET /hello/:username": {
          params: {
            username: [string, number];
          };
        };
      }>,
      {
        error: {
          "GET /hello/:username": {
            params: {
              username: "TypeError: value does not extend `string | number | bigint | boolean | undefined | null`";
            };
          };
        };
      }
    >
  >,
  Util.Assert<
    Util.Equals<
      // @ts-expect-error: general routes; field names of requestHeaders should be in lowercase
      OptqApi<{
        "GET /hello": {
          requestHeaders: {
            Authorization: string;
          };
        };
      }>,
      {
        error: {
          "GET /hello": {
            requestHeaders: {
              Authorization: "TypeError: field name `Authorization` should be in lowercase";
            };
          };
        };
      }
    >
  >,
  Util.Assert<
    Util.Equals<
      // @ts-expect-error: general routes; field names of requestHeaders should be in lowercase
      OptqApi<{
        "GET /hello": {
          responseHeaders: {
            "X-Provided-By": string;
          };
        };
      }>,
      {
        error: {
          "GET /hello": {
            responseHeaders: {
              "X-Provided-By": "TypeError: field name `X-Provided-By` should be in lowercase";
            };
          };
        };
      }
    >
  >,
  Util.Assert<
    Util.Equals<
      // @ts-expect-error: general routes; error status should be of type Http.ErrorStatus
      OptqApi<{
        "GET /hello": {
          error: { status: 101 } | { status: 400 };
        };
      }>,
      {
        error: {
          "GET /hello": {
            error: "TypeError: error status should be of type Http.ErrorStatus";
          };
        };
      }
    >
  >,
  Util.Assert<
    Util.Equals<
      // @ts-expect-error: general routes; fields other than params, body, requestHeaders, responseHeaders, data, resource, error are not allowed
      OptqApi<{
        "GET /hello": {
          customField: string;
          message: string;
        };
      }>,
      {
        error: {
          "GET /hello": {
            customField: "TypeError: fields other than params, body, requestHeaders, responseHeaders, data, resource, error are not allowed";
            message: "TypeError: fields other than params, body, requestHeaders, responseHeaders, data, resource, error are not allowed";
          };
        };
      }
    >
  >,
  Util.Assert<
    Util.Equals<
      // @ts-expect-error: GET routes; data is missing
      OptqApi<{
        "GET /hello": {};
      }>,
      {
        error: {
          "GET /hello": {
            data: "TypeError: data is missing";
          };
        };
      }
    >
  >,
  Util.Assert<
    Util.Equals<
      // @ts-expect-error: GET routes; body should not be defined
      OptqApi<{
        "GET /hello": {
          data: string;
          body: string;
        };
      }>,
      {
        error: {
          "GET /hello": {
            body: "TypeError: body should not be defined in GET routes";
          };
        };
      }
    >
  >,
  Util.Assert<
    Util.Equals<
      // @ts-expect-error: GET routes; body should not be defined
      OptqApi<{
        "DELETE /users/:userId": {
          params: {
            userId: string;
          };
          body: { displayName: string };
        };
      }>,
      {
        error: {
          "DELETE /users/:userId": {
            body: "TypeError: body should not be defined in DELETE routes";
          };
        };
      }
    >
  >,
];

type Api = OptqApi<{
  "GET /hello": {
    data: string;
    resource: number;
  };
  "POST /hello": {
    data: string;
  };
  "POST /hello/:username": {
    params: {
      username: string;
    };
    data: string;
  };
}>;

const _: OptqConfig<Api> = {
  routes: {
    "GET /hello": {
      transform({ data }) {
        return Number(data);
      },
    },
    "POST /hello": {
      onResponse({ ok, set, data }) {
        if (ok) {
          set("/hello", null, Number(data));
        }
      },
    },
  },
};
