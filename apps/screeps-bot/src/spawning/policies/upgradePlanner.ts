import { ROLE_PRIORITY, RoleName } from "../../config";
import {
  countRoleInRoom,
  getCreepSpawnCost,
  maxCostForRole,
} from "./spawnEnergyPolicy";
import { getTargetForRole } from "./targets";

export type UpgradeCandidate = {
  role: RoleName;
  creep: Creep;
  cost: number;
  maxCost: number;
  deficit: number;
};

export function isMaxSizedForRole(
  creep: Creep,
  role: RoleName,
  room: Room,
): boolean {
  return getCreepSpawnCost(creep) >= maxCostForRole(room, role);
}

export function getUpgradeCandidates(room: Room): Record<RoleName, number> {
  const res = {} as Record<RoleName, number>;

  for (const role of ROLE_PRIORITY) {
    const target = getTargetForRole(room, role);
    if (target <= 0) continue;

    const existing = countRoleInRoom(room, role);
    if (existing === 0) continue;

    const maxCost = maxCostForRole(room, role);

    let n = 0;
    for (const c of Object.values(Game.creeps)) {
      if (c.room.name !== room.name) continue;
      if (c.memory.role !== role) continue;
      if (c.memory.retire) continue;

      if (getCreepSpawnCost(c) < maxCost) n++;
    }

    if (n > 0) res[role] = n;
  }

  return res;
}

export function getNextUpgradeRole(room: Room): RoleName | null {
  const candidates = getUpgradeCandidates(room);
  for (const role of ROLE_PRIORITY) {
    if (candidates[role]) return role;
  }
  return null;
}

export function pickBestUpgradeCandidate(room: Room): UpgradeCandidate | null {
  let best: UpgradeCandidate | null = null;

  for (const role of ROLE_PRIORITY) {
    const target = getTargetForRole(room, role);
    if (target <= 0) continue;

    const maxCost = maxCostForRole(room, role);

    for (const c of Object.values(Game.creeps)) {
      if (c.room.name !== room.name) continue;
      if (c.memory.role !== role) continue;
      if (c.memory.retire) continue;

      const cost = getCreepSpawnCost(c);
      if (cost >= maxCost) continue;

      const deficit = maxCost - cost;

      if (!best || deficit > best.deficit) {
        best = { role, creep: c, cost, maxCost, deficit };
        continue;
      }

      if (best && deficit === best.deficit) {
        const a = c.ticksToLive ?? 999999;
        const b = best.creep.ticksToLive ?? 999999;
        if (a < b) best = { role, creep: c, cost, maxCost, deficit };
      }
    }
  }

  return best;
}
