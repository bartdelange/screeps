import { ROLE_CONFIG, ROLE_PRIORITY, RoleName } from "../config";
import {
  planSpawnForRole,
  countRoleInRoom,
  maxCostForRole,
} from "./policies/spawnEnergyPolicy";
import { getTargetForRole } from "./policies/targets";
import { pickBestUpgradeCandidate } from "./policies/upgradePlanner";
import {
  getRequestKeyForCreep,
  getRequestMemoryForKey,
} from "./policies/targets";
import { isPlanningActive } from "./helpers/planning";

export type PlannedSpawnIntent =
  | {
      kind: "request";
      role: RoleName;
      key: string;
      nameHint?: string;
      memory: Partial<CreepMemory>;
      blockedByEnergy: boolean;
      requiredEnergy: number;
      reason: "missing" | "normal";
    }
  | {
      kind: "count";
      role: RoleName;
      nameHint?: string;
      memory?: Partial<CreepMemory>;
      blockedByEnergy: boolean;
      requiredEnergy: number;
      reason: "missing" | "normal" | "upgrade";
    };

export type RoomPlan = {
  t: number;
  spawn?: PlannedSpawnIntent;
  upgrade?: {
    role: RoleName;
    retireCreepName: string;
    requiredEnergy: number;
    blockedByEnergy: boolean;
  };
};

function hasRequestedCreep(room: Room, role: RoleName, key: string): boolean {
  for (const c of Object.values(Game.creeps)) {
    if (c.memory.role !== role) continue;
    if (!isPlanningActive(c)) continue;

    if (role === "scout") {
      const homeRoom = c.memory.homeRoom as string | undefined;
      if (homeRoom !== room.name) continue;
    } else if (c.room.name !== room.name) {
      continue;
    }

    const creepKey = getRequestKeyForCreep(role, c);
    if (creepKey === key) return true;
  }
  return false;
}

function isBootstrapStarved(room: Room): boolean {
  const harvesters = countRoleInRoom(room, "harvester");
  const miners = countRoleInRoom(room, "miner");
  const movers = countRoleInRoom(room, "mover");
  return harvesters + miners + movers === 0;
}

function buildSpawnIntent(
  room: Room,
  role: RoleName,
  reason: PlannedSpawnIntent["reason"],
): PlannedSpawnIntent | null {
  const spec = ROLE_CONFIG[role];
  const planned = planSpawnForRole(room, role);

  const reqs = spec.spawn.requests?.(room) ?? [];
  for (const req of reqs) {
    if (hasRequestedCreep(room, role, req.key)) continue;
    return {
      kind: "request",
      role,
      key: req.key,
      nameHint: req.nameHint,
      memory: req.memory,
      blockedByEnergy: planned.blockedByEnergy,
      requiredEnergy: planned.cost,
      reason: reason === "missing" ? "missing" : "normal",
    };
  }

  const desired = spec.spawn.desired(room);
  const existing = countRoleInRoom(room, role);
  if (existing < desired) {
    return {
      kind: "count",
      role,
      blockedByEnergy: planned.blockedByEnergy,
      requiredEnergy: planned.cost,
      reason,
    };
  }

  return null;
}

function isRoomStable(room: Room): boolean {
  for (const role of ROLE_PRIORITY) {
    const target = getTargetForRole(room, role);
    if (target <= 0) continue;

    const active = countRoleInRoom(room, role);
    if (active < target) return false;
  }
  return true;
}

export function getRoomPlan(room: Room): RoomPlan {
  const plan: RoomPlan = { t: Game.time };

  // Hard bootstrap: if we have literally no economy, always push harvester.
  if (isBootstrapStarved(room)) {
    const planned = planSpawnForRole(room, "harvester");
    plan.spawn = {
      kind: "count",
      role: "harvester",
      blockedByEnergy: planned.blockedByEnergy,
      requiredEnergy: planned.cost,
      reason: "missing",
    };
    return plan;
  }

  // Pass 1: "missing role" (existing == 0) in strict priority order.
  for (const role of ROLE_PRIORITY) {
    const target = getTargetForRole(room, role);
    if (target <= 0) continue;

    const existing = countRoleInRoom(room, role);
    if (existing > 0) continue;

    const intent = buildSpawnIntent(room, role, "missing");
    if (!intent) continue;

    plan.spawn = intent;
    return plan; // STRICT: even if blocked, we stop here.
  }

  // Pass 2: normal desired/requests in strict priority order.
  for (const role of ROLE_PRIORITY) {
    const intent = buildSpawnIntent(room, role, "normal");
    if (!intent) continue;

    plan.spawn = intent;
    return plan; // STRICT: even if blocked, we stop here.
  }

  // Pass 3: upgrades only when the room is stable and nothing else wants spawning.
  if (isRoomStable(room)) {
    const best = pickBestUpgradeCandidate(room);
    if (best) {
      const requiredEnergy = maxCostForRole(room, best.role);
      const blockedByEnergy = room.energyAvailable < requiredEnergy;

      plan.upgrade = {
        role: best.role,
        retireCreepName: best.creep.name,
        requiredEnergy,
        blockedByEnergy,
      };

      if (!blockedByEnergy) {
        const spec = ROLE_CONFIG[best.role];
        const hasRequests = (spec.spawn.requests?.(room) ?? []).length > 0;

        if (hasRequests) {
          const key = getRequestKeyForCreep(best.role, best.creep);
          const memory = key ? getRequestMemoryForKey(best.role, key) : null;
          const extraMemory =
            best.role === "mover" &&
            typeof best.creep.memory.moverSourceId === "string"
              ? { moverSourceId: best.creep.memory.moverSourceId }
              : null;

          plan.spawn = {
            kind: "count",
            role: best.role,
            nameHint: key ? key.slice(-4) : undefined,
            memory: {
              ...(memory ?? {}),
              ...(extraMemory ?? {}),
            },
            blockedByEnergy: false,
            requiredEnergy,
            reason: "upgrade",
          };
          return plan;
        }

        plan.spawn = {
          kind: "count",
          role: best.role,
          blockedByEnergy: false,
          requiredEnergy,
          reason: "upgrade",
        };
        return plan;
      }
    }
  }

  return plan;
}
