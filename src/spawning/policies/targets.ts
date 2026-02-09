import { ROLE_CONFIG, RoleName } from "../../config";

export function getTargetForRole(room: Room, role: RoleName): number {
  const spec = ROLE_CONFIG[role];
  const reqs = spec.spawn.requests?.(room);
  if (reqs && reqs.length > 0) return reqs.length;
  return spec.spawn.desired(room);
}

export function getRequestedKeysForRole(room: Room, role: RoleName): string[] {
  const spec = ROLE_CONFIG[role];
  const reqs = spec.spawn.requests?.(room) ?? [];
  return reqs.map((r) => r.key);
}

export function getRequestKeyForCreep(
  role: RoleName,
  creep: Creep,
): string | null {
  if (role === "miner")
    return (creep.memory.sourceId as string | undefined) ?? null;
  return null;
}

export function getRequestMemoryForKey(
  role: RoleName,
  key: string,
): Partial<CreepMemory> | null {
  if (role === "miner") return { sourceId: key as Id<Source> };
  return null;
}
