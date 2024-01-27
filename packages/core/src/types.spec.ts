import type {
  AnyHeaders,
  ErrorStatus,
  OkStatus,
  OptqApiType,
  OptqConfig,
  OptqResponse,
} from "./types.js";

type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
  ? true
  : false;
type AssertTrue<A extends true> = A;

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
type ExtractConcrete<T> = {
  [K in keyof T as undefined extends T[K]
    ? never
    : Equals<T[K], never> extends true
      ? never
      : K]: T[K];
} & {};
type PrettifyOptional<T> = Prettify<ExtractConcrete<T> & Partial<T>>;

type TestCases = [
  // PrettifyOptional
  AssertTrue<
    Equals<
      PrettifyOptional<{
        a: string | undefined;
        b: number | null;
        c: never;
        d: undefined;
        e: object;
      }>,
      {
        a?: string | undefined;
        b: number | null;
        c?: never;
        d?: undefined;
        e: object;
      }
    >
  >,
  //
  // Valid API type
  OptqApiType<{
    responseHeaders: {
      "x-responded-at": string;
    };
    params: {
      v?: number;
    };
  }>,
  //
  // @ts-expect-error: invalid key in API type
  OptqApiType<{
    invalidKey: {
      v?: number;
    };
  }>,
  //
  // Routes
  OptqApiType<{
    "GET /hello/world": {
      params: {
        v?: number;
      };
      data: { value: string };
    };
    "GET /:username": {
      params: {
        username: string;
        v?: number;
      };
      data: { value: string };
    };
  }>,
  //
  // @ts-expect-error: Path params should be included in `params`
  OptqApiType<{
    "GET /hello/:username": {
      params: {
        v?: number;
      };
      data: { value: string };
    };
  }>,
  //
  // @ts-expect-error: GET routes cannot have body
  OptqApiType<{
    "GET /hello/world": {
      params: {
        v?: number;
      };
      data: { value: string };
      body: string;
    };
  }>,
  //
  // @ts-expect-error: GET routes should have data
  OptqApiType<{
    "GET /hello/world": {
      params: {
        v?: number;
      };
    };
  }>,
  //
  // @ts-expect-error: DELETE routes cannot have body
  OptqApiType<{
    "DELETE /hello/world": {
      params: {
        v?: number;
      };
      data: { value: string };
      body: string;
    };
  }>,
  //
  // @ts-expect-error: DELETE routes cannot have body
  OptqApiType<{
    "DELETE /hello/world": {
      params: {
        v?: number;
      };
      data: { value: string };
      body: string;
    };
  }>,
  //
  // OptqResponse<Api> has only one field: `headers`
  AssertTrue<Equals<OptqResponse<Api>, { headers: Api["responseHeaders"] }>>,
  //
  // GET route
  AssertTrue<
    Equals<
      OptqResponse<Api, "GET /:username">,
      | {
          headers: Api["responseHeaders"];
          status: OkStatus;
          ok: true;
          data: Api["GET /:username"]["data"];
        }
      | {
          headers: Api["responseHeaders"] & AnyHeaders;
          status: ErrorStatus;
          ok: false;
          data?: unknown;
        }
    >
  >,
  //
  // PATCH route
  AssertTrue<
    Equals<
      OptqResponse<Api, "PATCH /:username">,
      | {
          headers: {
            "x-responded-at": string;
          };
          status: OkStatus;
          ok: true;
          data: {
            username: string;
            displayName: string;
          };
        }
      | {
          headers: {
            "x-responded-at": string;
          } & AnyHeaders;
          status: 401;
          ok: false;
          data: { message: "Unauthorized" };
        }
      | {
          headers: {
            "x-responded-at": string;
            "x-allowed-user-groups": string;
          };
          status: 403;
          ok: false;
          data: { message: "Forbidden" };
        }
      | {
          headers: {
            "x-responded-at": string;
          } & AnyHeaders;
          status: 404;
          ok: false;
          data: unknown;
        }
    >
  >,
];

type Api = OptqApiType<{
  responseHeaders: {
    "x-responded-at": string;
  };
  "GET /:username": {
    params: {
      username: string;
    };
    data: {
      username: string;
      displayName: string;
    };
  };
  "PATCH /:username": {
    params: {
      username: string;
    };
    body: {
      displayName: string;
    };
    data: {
      username: string;
      displayName: string;
    };
    error:
      | { status: 401; data: { message: "Unauthorized" } }
      | {
          status: 403;
          headers: { "x-allowed-user-groups": string };
          data: { message: "Forbidden" };
        }
      | {
          status: 404;
        };
  };
}>;
const config: OptqConfig<Api> = {
  respondedAt({ headers }) {
    return BigInt(headers["x-responded-at"]);
  },
};
