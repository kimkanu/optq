import { readFileSync, writeFileSync } from "node:fs";
import { ExpoRequest, ExpoResponse } from "expo-router/server";
import { z } from "zod";

export async function POST(request: ExpoRequest, params: { userId: string }) {
  if (request.headers.get("x-user-credential") !== "correct") {
    return new Response(null, { status: 400 });
  }

  const userId = z.union([z.literal("1"), z.literal("2"), z.literal("3")]).safeParse(params.userId);
  if (!userId.success) {
    return ExpoResponse.json({ error: userId.error }, { status: 400 });
  }

  const body = z.object({ increaseBy: z.number().optional() }).safeParse(await request.json());
  if (!body.success) {
    return ExpoResponse.json({ error: body.error }, { status: 400 });
  }

  const version = increaseVersion(userId.data, body.data.increaseBy);

  return ExpoResponse.json(
    { version },
    {
      headers: {
        "access-control-expose-headers": "x-responded-at",
        "x-responded-at": Date.now().toString(),
      },
    },
  );
}

export function increaseVersion(userId: string, increaseBy?: number) {
  let versions = JSON.parse(
    (() => {
      try {
        return readFileSync("./state.json", "utf-8");
      } catch {
        return "{}";
      }
    })(),
  );

  versions[userId] ??= 1;
  versions[userId] += increaseBy ?? 1;

  writeFileSync("./state.json", JSON.stringify(versions, null, 2));

  return versions[userId];
}
