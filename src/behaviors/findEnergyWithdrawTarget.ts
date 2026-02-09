import {
  type EnergyWithdrawPolicy,
  findEnergyWithdrawTargetWithPolicy,
} from "./policies/energyAcquirePolicy";
import type { EnergyWithdrawTarget } from "./helpers/types";

export function findEnergyWithdrawTarget(
  creep: Creep,
  opts: EnergyWithdrawPolicy = {},
): EnergyWithdrawTarget | null {
  return findEnergyWithdrawTargetWithPolicy(creep, {
    excludeLinkRoles: ["source"],
    ...opts,
  });
}
