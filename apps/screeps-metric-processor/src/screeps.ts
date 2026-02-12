import { ScreepsAPI } from "screeps-api";
import { Target } from "./types";
import { decodeMemoryPayload, getByPath } from "./utils";

export async function createScreepsApi(target: Target): Promise<ScreepsAPI> {
  let url: URL;
  try {
    url = new URL(target.baseUrl);
  } catch (error) {
    url = new URL(`http://${target.baseUrl}`);
  }

  const api = new ScreepsAPI({
    protocol: url.protocol.replace(":", ""),
    hostname: url.hostname,
    port: url.port ? Number(url.port) : undefined,
    path: url.pathname || "/",
    token: target.auth?.token,
  });

  if (!target.auth?.token && target.auth?.email && target.auth?.password) {
    await api.auth(target.auth.email, target.auth.password);
  }

  return api;
}

export async function fetchMemoryPath(
  api: ScreepsAPI,
  memoryPath: string
): Promise<unknown> {
  if (api?.raw?.user?.memory?.get) {
    const res = await api.raw.user.memory.get(memoryPath);
    const decoded = decodeMemoryPayload(res);
    return getByPath(decoded, memoryPath) ?? decoded;
  }
  const rawAny = api.raw as unknown as {
    get?: (path: string, data?: Record<string, unknown>) => Promise<unknown>;
  };
  if (rawAny?.get) {
    const res = await rawAny.get("/api/user/memory", { path: memoryPath });
    const decoded = decodeMemoryPayload(res);
    return getByPath(decoded, memoryPath) ?? decoded;
  }
  if (api?.memory?.get) {
    const res = await api.memory.get(memoryPath);
    const decoded = decodeMemoryPayload(res);
    return getByPath(decoded, memoryPath) ?? decoded;
  }
  throw new Error("Screeps API client does not support memory reads");
}
