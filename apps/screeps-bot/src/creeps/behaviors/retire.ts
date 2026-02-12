import { findSpawnOrExtensionNeedingEnergy } from "./helpers/findSpawnOrExtensionNeedingEnergy";
import { findEnergyDepositTarget } from "./helpers/findEnergyDepositTarget";
import { transferEnergy } from "./transferEnergy";
import { sayState } from "../../utils/sayState";

export function getGraveyardPos(creep: Creep): RoomPosition | null {
  const flag = Game.flags["Graveyard"];
  if (!flag) return null;

  // When the flag is in another room, path toward it directly.
  if (flag.pos.roomName !== creep.room.name) return flag.pos;

  const terrain = creep.room.getTerrain();
  const candidates: RoomPosition[] = [];

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = flag.pos.x + dx;
      const y = flag.pos.y + dy;
      if (x < 0 || x > 49 || y < 0 || y > 49) continue;
      if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;
      candidates.push(new RoomPosition(x, y, flag.pos.roomName));
    }
  }

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
