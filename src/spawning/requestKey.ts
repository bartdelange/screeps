import { RoleName } from "../config";

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
