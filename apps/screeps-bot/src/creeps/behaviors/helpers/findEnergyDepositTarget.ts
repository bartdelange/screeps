import { findEnergyDepositTarget as findEnergyDepositTargetCore } from "../policies/energyDepositPolicy";

export function findEnergyDepositTarget(
  creep: Creep,
): AnyStoreStructure | null {
  return findEnergyDepositTargetCore(creep);
}
