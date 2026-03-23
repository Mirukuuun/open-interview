import { NextResponse } from "next/server";

import { healthPayloadSchema } from "@/lib/schemas/health";
import { apiOk } from "@/server/api/envelope";
import { getHealthSnapshot } from "@/server/health/service";

export function GET() {
  const payload = healthPayloadSchema.parse(getHealthSnapshot());

  return NextResponse.json(apiOk(payload));
}
