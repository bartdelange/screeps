import zlib from "zlib";
import { Primitive } from "./types";

export function getByPath(obj: unknown, dottedPath?: string): unknown {
  if (!dottedPath) return obj;
  return dottedPath.split(".").reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    if (typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

export function flattenValue(
  value: unknown,
  prefix: string,
  out: Record<string, Primitive>
): void {
  if (value === null || value === undefined) return;
  if (typeof value === "number") {
    if (Number.isFinite(value)) out[prefix] = value;
    return;
  }
  if (typeof value === "boolean" || typeof value === "string") {
    out[prefix] = value;
    return;
  }
  if (Array.isArray(value)) {
    out[prefix] = JSON.stringify(value);
    return;
  }
  if (typeof value === "object") {
    Object.keys(value as Record<string, unknown>).forEach((key) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      flattenValue((value as Record<string, unknown>)[key], nextPrefix, out);
    });
    return;
  }
  out[prefix] = String(value);
}

export function decodeMemoryPayload(payload: unknown): unknown {
  if (payload && typeof payload === "object" && "data" in payload) {
    return decodeMemoryPayload((payload as { data: unknown }).data);
  }
  if (typeof payload !== "string") return payload;
  if (!payload.startsWith("gz:")) return payload;

  const raw = Buffer.from(payload.slice(3), "base64");
  const jsonText = zlib.gunzipSync(raw).toString("utf8");
  return JSON.parse(jsonText) as unknown;
}
