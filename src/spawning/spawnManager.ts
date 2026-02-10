import { ROLE_CONFIG, RoleName } from "../config";
import { getRoomPlanCached } from "./helpers/planAccess";
import { planSpawnForRole } from "./policies/spawnEnergyPolicy";
import type { PlannedSpawnIntent } from "./roomPlanner";
import { updateStatsLatestAfterSpawn } from "../telemetry/statsLatest";

function spawnWithMemory(
  spawn: StructureSpawn,
  role: RoleName,
  extraMemory?: Partial<CreepMemory>,
  nameHint?: string,
): boolean {
  const spec = ROLE_CONFIG[role];
  const planned = planSpawnForRole(spawn.room, role);

  if (planned.blockedByEnergy) return false;

  const baseMemory = spec.memory
    ? spec.memory(role)
    : ({ role } as CreepMemory);

  const memory: CreepMemory = {
    ...baseMemory,
    ...(extraMemory ?? {}),
    role,
  } as CreepMemory;

  memory.spawnCost = planned.cost;

  const name = `${role}-${nameHint ? `${nameHint}-` : ""}${Game.time % 1000}`;
  const res = spawn.spawnCreep(planned.body, name, { memory });

  if (res !== OK) {
    console.log(
      `spawn failed room=${spawn.room.name} role=${role} code=${res} cost=${planned.cost} energy=${spawn.room.energyAvailable}/${spawn.room.energyCapacityAvailable}`,
    );
    return false;
  }

  return true;
}

function getPlannedSpawn(room: Room): PlannedSpawnIntent | undefined {
  return getRoomPlanCached(room).spawn;
}

export function runSpawnManager(room: Room): void {
  if (!room.controller?.my) return;

  const spawns = Object.values(Game.spawns).filter(
    (spawn) => spawn.room.name === room.name,
  );
  if (spawns.length === 0) return;

  for (const spawn of spawns) {
    if (!spawn.my) continue;
    if (spawn.spawning) continue;

    const intent = getPlannedSpawn(spawn.room);
    if (!intent) continue;
    if (intent.blockedByEnergy) continue;

    if (intent.kind === "request") {
      const spawned = spawnWithMemory(
        spawn,
        intent.role,
        intent.memory,
        intent.nameHint ?? intent.key.slice(-4),
      );
      if (spawned) updateStatsLatestAfterSpawn(spawn, intent);
      continue;
    }

    const spawned = spawnWithMemory(spawn, intent.role);
    if (spawned) updateStatsLatestAfterSpawn(spawn, intent);
  }
}
