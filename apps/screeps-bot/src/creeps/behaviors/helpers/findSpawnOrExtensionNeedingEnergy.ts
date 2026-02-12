import { findEnergyDepositTarget } from "../policies/energyDepositPolicy";

export function findSpawnOrExtensionNeedingEnergy(
  creep: Creep,
): AnyStoreStructure | null {
  return findEnergyDepositTarget(creep, {
    includeTypes: [STRUCTURE_SPAWN, STRUCTURE_EXTENSION],
  });
}
