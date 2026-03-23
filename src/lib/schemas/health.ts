import { z } from "zod";

export const healthPayloadSchema = z.object({
  service: z.literal("open-interview-web"),
  status: z.literal("ok"),
  environment: z.enum(["development", "production", "test"]),
  timestamp: z.string().datetime(),
});

export type HealthPayload = z.infer<typeof healthPayloadSchema>;
