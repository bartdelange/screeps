import type { ActResult, EnergyWithdrawTarget } from "./types";

function isDroppedEnergy(
  target: EnergyWithdrawTarget,
): target is Resource<RESOURCE_ENERGY> {
  return (
    (target as any).resourceType === RESOURCE_ENERGY &&
    typeof (target as any).amount === "number"
  );
}

function isStoreTarget(
  target: EnergyWithdrawTarget,
): target is AnyStoreStructure {
  return (
    typeof (target as any).store?.getUsedCapacity === "function" &&
    typeof (target as any).store?.getFreeCapacity === "function"
  );
}

function countClaimants(room: Room, targetId: Id<_HasId>): number {
  let n = 0;
  for (const c of Object.values(Game.creeps)) {
    if (c.room.name !== room.name) continue;
    if (c.store.getFreeCapacity(RESOURCE_ENERGY) === 0) continue;
    if ((c.memory as any)._wId === targetId) n++;
  }
  return n;
}

export function withdrawEnergy(
  creep: Creep,
  target: EnergyWithdrawTarget,
): ActResult {
  (creep.memory as any)._wId = (target as any).id;

  if (isDroppedEnergy(target)) {
    const res = creep.pickup(target);
    if (res === OK) return "done";
    if (res === ERR_NOT_IN_RANGE) {
      creep.moveTo(target, { reusePath: 20 });
      return "not_in_range";
    }
    return "blocked";
  }

  if (!isStoreTarget(target)) return "blocked";

  const available = target.store.getUsedCapacity(RESOURCE_ENERGY);
  if (available <= 0) return "blocked";

  const free = creep.store.getFreeCapacity(RESOURCE_ENERGY);
  if (free <= 0) return "done";

  const claimants = Math.max(1, countClaimants(creep.room, target.id));
  const fairShare = Math.ceil(available / claimants);
  const amount = Math.max(1, Math.min(free, fairShare));

  const res = creep.withdraw(target, RESOURCE_ENERGY, amount);

  if (res === OK) return "done";
  if (res === ERR_NOT_IN_RANGE) {
    creep.moveTo(target, { reusePath: 20 });
    return "not_in_range";
  }
  return "blocked";
}
