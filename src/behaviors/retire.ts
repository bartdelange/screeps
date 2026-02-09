import { findSpawnOrExtensionNeedingEnergy } from "./findSpawnOrExtensionNeedingEnergy";
import { findEnergyDepositTarget } from "./findEnergyDepositTarget";
import { transferEnergy } from "./transferEnergy";
import { sayState } from "../utils/sayState";

export function getGraveyardPos(creep: Creep): RoomPosition | null {
  const flag = Game.flags["Graveyard"];
  if (!flag) return null;

  const candidates =
    flag.pos.getRangeTo(creep.pos) === 0
      ? [flag.pos]
      : creep.room
          .lookForAtArea(
            LOOK_TERRAIN,
            Math.max(0, flag.pos.y - 1),
            Math.max(0, flag.pos.x - 1),
            Math.min(49, flag.pos.y + 1),
            Math.min(49, flag.pos.x + 1),
            true,
          )
          .filter((t) => t.terrain !== "wall")
          .map((t) => new RoomPosition(t.x, t.y, flag.pos.roomName));

  return creep.pos.findClosestByRange(candidates) ?? flag.pos;
}

function getPrimarySpawn(room: Room): StructureSpawn | null {
  return (
    Object.values(Game.spawns).find((s) => s.room.name === room.name) ?? null
  );
}

function getFallbackParkPos(creep: Creep): RoomPosition | null {
  const spawn = getPrimarySpawn(creep.room) ?? Object.values(Game.spawns)[0];
  if (!spawn) return null;
  return new RoomPosition(spawn.pos.x + 1, spawn.pos.y + 1, spawn.pos.roomName);
}

export function runRetire(creep: Creep): boolean {
  if (!creep.memory.retire) return false;

  sayState(creep, `Retiring... (${creep.memory.retireReason})`);

  if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
    const prim = findSpawnOrExtensionNeedingEnergy(creep);
    if (prim) {
      transferEnergy(creep, prim);
      return true;
    }

    const store = findEnergyDepositTarget(creep);
    if (store) {
      transferEnergy(creep, store);
      return true;
    }

    creep.drop(RESOURCE_ENERGY);
    return true;
  }

  const spawn = getPrimarySpawn(creep.room);
  if (spawn) {
    if (creep.pos.isNearTo(spawn)) {
      sayState(creep, "♻️");
      spawn.recycleCreep(creep);
      return true;
    }

    if ((creep.ticksToLive ?? 0) > spawn.pos.getRangeTo(creep.pos) + 10) {
      creep.moveTo(spawn, { reusePath: 50 });
      return true;
    }
  }

  const parkPos = getGraveyardPos(creep) ?? getFallbackParkPos(creep);

  if (!parkPos) return true;

  if (creep.pos.isEqualTo(parkPos)) {
    sayState(creep, "💀");
    return true; // let it expire naturally
  }

  creep.moveTo(parkPos, { reusePath: 50 });
  return true;
}
