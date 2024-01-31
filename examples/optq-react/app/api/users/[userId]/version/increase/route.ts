import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { versions } from "../state";

export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  if (request.headers.get("x-user-credential") !== "correct") {
    return new Response(null, { status: 400 });
  }

  const userId = z.union([z.literal("1"), z.literal("2"), z.literal("3")]).safeParse(params.userId);
  if (!userId.success) {
    return NextResponse.json({ error: userId.error }, { status: 400 });
  }

  const body = z.object({ increaseBy: z.number().optional() }).safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error }, { status: 400 });
  }

  versions[userId.data] += body.data.increaseBy ?? 1;
  return NextResponse.json({
    version: versions[userId.data],
  });
}
