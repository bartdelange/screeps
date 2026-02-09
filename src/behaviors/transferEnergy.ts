import { moveWithRecovery } from "./helpers/moveWithRecovery";
import type { ActResult } from "./helpers/types";

type TransferOpts = {
  resource?: ResourceConstant;
  move?: MoveToOpts;
};

export function canReceiveResource(
  target: AnyStoreStructure | null,
  resource: ResourceConstant,
): target is AnyStoreStructure {
  if (!target) return false;
  return (target.store.getFreeCapacity(resource) ?? 0) > 0;
}

export function transferResource(
  creep: Creep,
  target: AnyStoreStructure,
  opts?: TransferOpts,
): ActResult {
  const resource = opts?.resource ?? RESOURCE_ENERGY;
  const res = creep.transfer(target, resource);

  if (res === OK) return "done";

  if (res === ERR_NOT_IN_RANGE) {
    const moveRes = moveWithRecovery(
      creep,
      target.pos,
      opts?.move ?? { reusePath: 20, maxRooms: 1 },
    );
    return moveRes === "invalid" ? "blocked" : "not_in_range";
  }

  return "blocked";
}

export function transferEnergy(
  creep: Creep,
  target: AnyStoreStructure,
): ActResult {
  return transferResource(creep, target, { resource: RESOURCE_ENERGY });
}
