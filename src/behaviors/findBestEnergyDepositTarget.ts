import { findEnergyDepositTargetWithPolicy } from "./policies/energyDepositPolicy";

export function findBestEnergyDepositTarget(
  creep: Creep,
): AnyStoreStructure | null {
  return findEnergyDepositTargetWithPolicy(creep);
}
