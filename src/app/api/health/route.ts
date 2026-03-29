import { NextResponse } from "next/server";

import { healthPayloadSchema } from "@/lib/schemas/health";
import { apiOk } from "@/server/api/envelope";
import { getHealthSnapshot } from "@/server/health/service";

export async function GET() {
  const payload = healthPayloadSchema.parse(await getHealthSnapshot());

  return NextResponse.json(apiOk(payload));
}
