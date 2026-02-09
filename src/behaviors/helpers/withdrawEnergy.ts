import type { ActResult, EnergyWithdrawTarget } from "./types";
import { moveWithRecovery } from "./moveWithRecovery";
import {
  countWithdrawClaimants,
  isDroppedEnergy,
} from "../policies/energyAcquirePolicy";

function isStoreTarget(
  target: EnergyWithdrawTarget,
): target is AnyStoreStructure {
  return (
    typeof (target as any).store?.getUsedCapacity === "function" &&
    typeof (target as any).store?.getFreeCapacity === "function"
  );
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
      const moveRes = moveWithRecovery(creep, target.pos, {
        reusePath: 20,
        maxRooms: 1,
      });
      return moveRes === "invalid" ? "blocked" : "not_in_range";
    }
    return "blocked";
  }

  if (!isStoreTarget(target)) return "blocked";

  const available = target.store.getUsedCapacity(RESOURCE_ENERGY);
  if (available <= 0) return "blocked";

  const free = creep.store.getFreeCapacity(RESOURCE_ENERGY);
  if (free <= 0) return "done";

  const claimants = Math.max(1, countWithdrawClaimants(creep.room, target.id));
  const fairShare = Math.ceil(available / claimants);
  const amount = Math.max(1, Math.min(free, fairShare));

  const res = creep.withdraw(target, RESOURCE_ENERGY, amount);

  if (res === OK) return "done";
  if (res === ERR_NOT_IN_RANGE) {
    const moveRes = moveWithRecovery(creep, target.pos, {
      reusePath: 20,
      maxRooms: 1,
    });
    return moveRes === "invalid" ? "blocked" : "not_in_range";
  }
  return "blocked";
}
