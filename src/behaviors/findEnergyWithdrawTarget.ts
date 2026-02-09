import type { EnergyWithdrawTarget } from "./types";

function countClaimants(room: Room, targetId: Id<_HasId>): number {
  let n = 0;
  for (const c of Object.values(Game.creeps)) {
    if (c.room.name !== room.name) continue;
    if (c.store.getFreeCapacity() === 0) continue;
    if (c.memory._wId === targetId) n++;
  }
  return n;
}

export function findEnergyWithdrawTarget(
  creep: Creep,
): EnergyWithdrawTarget | null {
  const dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
    filter: (r) => r.resourceType === RESOURCE_ENERGY && r.amount >= 20,
  }) as Resource<RESOURCE_ENERGY> | null;

  if (dropped) return dropped;

  const stores = creep.room.find(FIND_STRUCTURES, {
    filter: (s) =>
      (s.structureType === STRUCTURE_CONTAINER ||
        s.structureType === STRUCTURE_STORAGE) &&
      (s as AnyStoreStructure).store.getUsedCapacity(RESOURCE_ENERGY) > 0,
  }) as AnyStoreStructure[];

  if (stores.length === 0) return null;

  const scored = stores
    .map((s) => {
      const d = creep.pos.getRangeTo(s);
      const c = countClaimants(creep.room, s.id as Id<_HasId>);
      const e = s.store.getUsedCapacity(RESOURCE_ENERGY);
      const score = d + c * 5 - Math.min(10, e / 200);
      return { s, score };
    })
    .sort((a, b) => a.score - b.score);

  return scored[0]?.s ?? null;
}
