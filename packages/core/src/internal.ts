import objectHash from "object-hash";
import type {
  Method,
  OptqAdditionalApiTypeKeys,
  OptqApiBase,
  OptqConfig,
  OptqParams,
  OptqPredictionStore,
  OptqResourceData,
  OptqResourceId,
  OptqResourceRouteConfig,
} from "./types.js";

export async function internalFetch<D, H>({
  baseUrl,
  method,
  path,
  params,
  headers,
  body,
}: {
  baseUrl: string;
  method: Method;
  path: string;
  params?: Record<string, string | number | undefined | null>;
  headers?: Record<string, string | undefined>;
  body?: unknown;
}) {
  let url = /^https?:\/\//.test(path) ? path : baseUrl + path;
  {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value === undefined || value === null) continue;
      const regex = new RegExp(`:${key}(?=/|$)`, "g");
      if (regex.test(url)) {
        url = url.replace(regex, (value as string | number).toString());
      } else {
        searchParams.append(key, (value as string | number).toString());
      }
    }
    const stringifiedSearchParams = searchParams.toString();
    url += `${stringifiedSearchParams ? "?" : ""}${stringifiedSearchParams}`;
  }

  const isBodyJson =
    body === undefined
      ? true
      : typeof body === "object" && (body === null || body.constructor === Object);
  const isBodyText = body === undefined ? false : typeof body === "string";
  const isBodyFormData = body === undefined ? false : body instanceof FormData;

  const response = await fetch(url, {
    method,
    headers: {
      "content-type": isBodyJson
        ? "application/json"
        : isBodyText
          ? "text/plain"
          : isBodyFormData
            ? "multipart/form-data"
            : "application/octet-stream",
      ...headers,
    },
    body:
      body === undefined
        ? undefined
        : isBodyJson
          ? JSON.stringify(body)
          : (body as BodyInit | null | undefined),
  });

  const contentType = response.headers.get("content-type");
  const headersObject = Object.fromEntries(response.headers.entries()) as H;

  let data: D | undefined;
  try {
    data = (
      contentType?.includes("json")
        ? await response.json()
        : contentType?.startsWith("text/")
          ? await response.text()
          : await response.arrayBuffer()
    ) as D;
  } catch {
    data = undefined;
  }

  return {
    status: response.status,
    ok: response.ok,
    headers: headersObject,
    data,
    raw: response,
  };
}

export function getDefaultRespondedAt(response: { headers: Record<string, string | undefined> }) {
  return new Date(response.headers.date ?? Date.now()).getTime();
}

export function getGetterInner<Api extends OptqApiBase<Api>>(optq: {
  config: OptqConfig<Api>;
}) {
  return <ResId extends OptqResourceId<Api>>(
    store: OptqPredictionStore<Api>,
    resourceId: ResId,
    params: OptqParams<Api, `GET ${ResId}` & Exclude<keyof Api, OptqAdditionalApiTypeKeys>>,
  ) => {
    type ApiId = `GET ${ResId}` & Exclude<keyof Api, OptqAdditionalApiTypeKeys>;
    const apiId = `GET ${resourceId}` as ApiId;

    const route = optq.config?.routes?.[apiId] as OptqResourceRouteConfig<Api, ApiId, ResId>;
    if (!route) return undefined;

    const hashFn = (route?.hash ?? objectHash) as (params: OptqParams<Api, ApiId>) => string;
    const hash = hashFn((params ?? {}) as OptqParams<Api, ApiId>);

    const prediction = store[resourceId]?.[hash];
    if (prediction !== undefined) return prediction;

    if (typeof route.defaultValue === "function") {
      return (
        route.defaultValue as (params: OptqParams<Api, ApiId>) => OptqResourceData<Api, ResId>
      )((params ?? {}) as OptqParams<Api, ApiId>);
    }
    return route.defaultValue;
  };
}
