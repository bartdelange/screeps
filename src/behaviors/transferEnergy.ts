import type { ActResult } from "./types";

export function transferEnergy(
  creep: Creep,
  target: AnyStoreStructure,
): ActResult {
  const res = creep.transfer(target, RESOURCE_ENERGY);

  if (res === OK) return "done";

  if (res === ERR_NOT_IN_RANGE) {
    creep.moveTo(target, { reusePath: 20 });
    return "not_in_range";
  }

  return "blocked";
}
