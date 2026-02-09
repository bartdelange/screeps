import { ROLE_CONFIG, RoleName } from "../../config";
import { getTargetForRole } from "./targets";
import { isPlanningActive } from "../helpers/planningState";

export function countRoleInRoom(room: Room, role: RoleName): number {
  let n = 0;
  for (const c of Object.values(Game.creeps)) {
    if (c.room.name !== room.name) continue;
    if (c.memory.role !== role) continue;
    if (!isPlanningActive(c)) continue;
    n++;
  }
  return n;
}

export function bodyCost(body: BodyPartConstant[]): number {
  return body.reduce((sum, part) => sum + BODYPART_COST[part], 0);
}

export function maxBodyForRole(room: Room, role: RoleName): BodyPartConstant[] {
  const spec = ROLE_CONFIG[role];
  return spec.makeBody({
    available: room.energyCapacityAvailable,
    capacity: room.energyCapacityAvailable,
    room,
  });
}

export function maxCostForRole(room: Room, role: RoleName): number {
  return bodyCost(maxBodyForRole(room, role));
}

export function getCreepSpawnCost(creep: Creep): number {
  const memCost = creep.memory.spawnCost;
  if (typeof memCost === "number" && Number.isFinite(memCost)) return memCost;
  return bodyCost(creep.body.map((p) => p.type));
}

export type SpawnPlanResult = {
  body: BodyPartConstant[];
  cost: number;
  blockedByEnergy: boolean;
  underTarget: boolean;
  maxCost: number;
};

export function planSpawnForRole(room: Room, role: RoleName): SpawnPlanResult {
  const spec = ROLE_CONFIG[role];

  const target = getTargetForRole(room, role);
  const existing = countRoleInRoom(room, role);
  const underTarget = target > 0 && existing < target;

  const budget = underTarget
    ? room.energyAvailable
    : room.energyCapacityAvailable;

  const body = spec.makeBody({
    available: budget,
    capacity: budget,
    room,
  });

  const cost = bodyCost(body);
  const maxCost = maxCostForRole(room, role);

  return {
    body,
    cost,
    maxCost,
    underTarget,
    blockedByEnergy: room.energyAvailable < cost,
  };
}
