import { readFileSync } from "node:fs";
import { ExpoRequest, ExpoResponse } from "expo-router/server";
import { z } from "zod";

export function GET(_: ExpoRequest, params: { userId: string }) {
  const userId = z.union([z.literal("1"), z.literal("2"), z.literal("3")]).safeParse(params.userId);
  if (!userId.success) {
    return ExpoResponse.json({ error: userId.error }, { status: 400 });
  }

  return ExpoResponse.json(
    {
      version: getVersion(userId.data),
    },
    {
      headers: {
        "access-control-expose-headers": "x-responded-at",
        "x-responded-at": Date.now().toString(),
      },
    },
  );
}

function getVersion(userId: string) {
  let versions = JSON.parse(
    (() => {
      try {
        return readFileSync("./state.json", "utf-8");
      } catch {
        return "{}";
      }
    })(),
  );

  return versions[userId] ?? 1;
}
