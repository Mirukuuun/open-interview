import type { HealthPayload } from "@/lib/schemas/health";

export function getHealthSnapshot(): HealthPayload {
  return {
    service: "open-interview-web",
    status: "ok",
    environment:
      process.env.NODE_ENV === "production"
        ? "production"
        : process.env.NODE_ENV === "test"
          ? "test"
          : "development",
    timestamp: new Date().toISOString(),
  };
}
