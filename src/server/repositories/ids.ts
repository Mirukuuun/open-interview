import { randomUUID } from "node:crypto";

export function createOpaqueId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

export function nowUtcIso() {
  return new Date().toISOString();
}
