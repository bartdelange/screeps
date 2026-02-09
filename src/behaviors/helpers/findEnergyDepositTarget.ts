import { findEnergyDepositTargetWithPolicy } from "../policies/energyDepositPolicy";

export function findEnergyDepositTarget(
  creep: Creep,
): AnyStoreStructure | null {
  return findEnergyDepositTargetWithPolicy(creep);
}
