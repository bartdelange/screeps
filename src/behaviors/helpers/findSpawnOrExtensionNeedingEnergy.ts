import { findEnergyDepositTargetWithPolicy } from "../policies/energyDepositPolicy";

export function findSpawnOrExtensionNeedingEnergy(
  creep: Creep,
): AnyStoreStructure | null {
  return findEnergyDepositTargetWithPolicy(creep, {
    priorityTiers: [[STRUCTURE_SPAWN, STRUCTURE_EXTENSION]],
  });
}
