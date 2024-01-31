import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { versions } from "./state";

export function GET(_: NextRequest, { params }: { params: { userId: string } }) {
  const userId = z.union([z.literal("1"), z.literal("2"), z.literal("3")]).safeParse(params.userId);
  if (!userId.success) {
    return NextResponse.json({ error: userId.error }, { status: 400 });
  }

  return NextResponse.json({
    version: versions[userId.data],
  });
}
