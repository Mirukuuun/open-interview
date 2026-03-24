import { createHash, randomUUID } from "node:crypto";

export function createOpaqueId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

export function createStableOpaqueId(prefix: string, seed: string) {
  return `${prefix}_${createHash("sha256").update(seed).digest("hex").slice(0, 24)}`;
}

export function nowUtcIso() {
  return new Date().toISOString();
}
