import { ROLE_CONFIG, ROLE_PRIORITY, RoleName } from "../config";
import { getRoomPlanCached } from "./helpers/planAccess";
import {
  getRequestKeyForCreep,
  getRequestedKeysForRole,
  getTargetForRole,
} from "./policies/targets";
import { markRetire } from "../utils/markRetire";

const NEAR_DEATH_TTL = 50;
const RETIRE_EXCLUDED_ROLES = new Set<RoleName>(["scout"]);

function isRoleExcludedFromRetire(role: RoleName): boolean {
  return RETIRE_EXCLUDED_ROLES.has(role);
}

function isUsableForRetireLogic(c: Creep): boolean {
  if (c.spawning) return false;
  return typeof c.ticksToLive === "number";
}

function creepsInRoomByRole(room: Room, role: RoleName): Creep[] {
  return Object.values(Game.creeps).filter((c) => {
    if (c.room.name !== room.name) return false;
    if (c.memory.role !== role) return false;
    if (c.memory.retire) return false;
    if (!isUsableForRetireLogic(c)) return false;
    return true;
  });
}

function retireSoonestToDie(creeps: Creep[], count: number): void {
  const sorted = creeps
    .slice()
    .sort((a, b) => (a.ticksToLive as number) - (b.ticksToLive as number));

  for (let i = 0; i < count && i < sorted.length; i++) {
    markRetire(sorted[i], "excess");
  }
}

function hasRedundantReplacement(
  role: RoleName,
  group: Creep[],
  me: Creep,
): boolean {
  if (!isUsableForRetireLogic(me)) return false;

  const myTTL = me.ticksToLive as number;
  if (myTTL > NEAR_DEATH_TTL) return false;

  const myKey = getRequestKeyForCreep(role, me);

  for (const c of group) {
    if (c.name === me.name) continue;
    if (!isUsableForRetireLogic(c)) continue;

    if (myKey) {
      const otherKey = getRequestKeyForCreep(role, c);
      if (otherKey !== myKey) continue;
    }

    const ttl = c.ticksToLive as number;
    if (ttl > NEAR_DEATH_TTL) return true;
  }

  return false;
}

function applyNearDeathRetires(
  room: Room,
  role: RoleName,
  target: number,
): void {
  if (target <= 0) return;

  const creeps = creepsInRoomByRole(room, role);
  if (creeps.length < target) return;

  if (role === "miner") {
    const byKey: Record<string, Creep[]> = {};
    for (const c of creeps) {
      const key = getRequestKeyForCreep(role, c);
      if (!key) continue;
      (byKey[key] ??= []).push(c);
    }

    for (const key of Object.keys(byKey)) {
      const group = byKey[key];
      if (group.length <= 1) continue;

      for (const c of group) {
        if (hasRedundantReplacement(role, group, c)) {
          markRetire(c, "near-death");
        }
      }
    }

    return;
  }

  if (creeps.length <= 1) return;

  for (const c of creeps) {
    if (hasRedundantReplacement(role, creeps, c)) {
      markRetire(c, "near-death");
    }
  }
}

function runRequestBasedRetires(room: Room, role: RoleName): void {
  const desiredKeys = new Set(getRequestedKeysForRole(room, role));
  if (desiredKeys.size === 0) return;

  const creeps = creepsInRoomByRole(room, role);

  for (const c of creeps) {
    const key = getRequestKeyForCreep(role, c);
    if (!key || !desiredKeys.has(key)) {
      markRetire(c, "request-mismatch");
    }
  }

  const remaining = creepsInRoomByRole(room, role);

  const byKey: Record<string, Creep[]> = {};
  for (const c of remaining) {
    const key = getRequestKeyForCreep(role, c);
    if (!key) continue;
    (byKey[key] ??= []).push(c);
  }

  for (const key of Object.keys(byKey)) {
    const group = byKey[key];
    if (group.length <= 1) continue;

    const sortedByTTLDesc = group
      .slice()
      .sort((a, b) => (b.ticksToLive as number) - (a.ticksToLive as number));

    const keep = sortedByTTLDesc[0];
    for (const c of sortedByTTLDesc.slice(1)) {
      if (c.name !== keep.name) markRetire(c, "request-duplicate");
    }
  }

  const active = creepsInRoomByRole(room, role).length;
  const target = desiredKeys.size;
  if (active > target) {
    applyNearDeathRetires(room, role, target);
  }
}

function applyPlannedUpgradeRetire(room: Room): void {
  const plan = getRoomPlanCached(room);

  const upg = plan.upgrade;
  if (!upg) return;
  if (upg.blockedByEnergy) return;

  const creep = Game.creeps[upg.retireCreepName];
  if (!creep) return;
  if (creep.room.name !== room.name) return;
  if (creep.memory.retire) return;
  if (creep.spawning) return;

  const role = creep.memory.role as RoleName | undefined;
  if (role && isRoleExcludedFromRetire(role)) return;

  markRetire(creep, "planned-upgrade");
}

export function runRetireManager(room: Room): void {
  if (!room.controller?.my) return;

  for (const role of ROLE_PRIORITY) {
    if (isRoleExcludedFromRetire(role)) continue;

    const spec = ROLE_CONFIG[role];

    const hasRequests = (spec.spawn.requests?.(room) ?? []).length > 0;
    if (hasRequests) {
      runRequestBasedRetires(room, role);
      continue;
    }

    const target = getTargetForRole(room, role);
    const creeps = creepsInRoomByRole(room, role);
    const active = creeps.length;

    if (active > target) {
      retireSoonestToDie(creeps, active - target);
      continue;
    }

    applyNearDeathRetires(room, role, target);
  }

  applyPlannedUpgradeRetire(room);
}
