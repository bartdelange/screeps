import { harvestSource } from "../harvestSource";
import { withdrawEnergy } from "./withdrawEnergy";
import { findEnergyWithdrawTarget } from "../policies/energyAcquirePolicy";
import {
  canHarvestByRolePolicy,
  getEnergyAcquirePolicyForRole,
} from "../policies/roleEnergyPolicy";

export type GetEnergyOpts = {
  preferPos: RoomPosition;
  harvestWithin?: number;
  withdrawWithin?: number;
};

export type GetEnergyResult = "harvest" | "withdraw" | "idle";

export function getEnergyForAction(
  creep: Creep,
  opts: GetEnergyOpts,
): GetEnergyResult {
  const harvestWithin = opts.harvestWithin ?? 3;
  const withdrawWithin = opts.withdrawWithin ?? 12;
  const rolePolicy = getEnergyAcquirePolicyForRole(creep);
  const canHarvest =
    creep.getActiveBodyparts(WORK) > 0 && canHarvestByRolePolicy(creep, rolePolicy);

  const nearWorkStore = findEnergyWithdrawTarget(creep, {
    ...rolePolicy.withdrawPolicy,
    preferPos: opts.preferPos,
    maxPreferRange: withdrawWithin,
    preferOnly: true,
  });
  if (nearWorkStore) {
    withdrawEnergy(creep, nearWorkStore);
    return "withdraw";
  }

  const anyStore = findEnergyWithdrawTarget(creep, rolePolicy.withdrawPolicy);
  if (anyStore) {
    withdrawEnergy(creep, anyStore);
    return "withdraw";
  }

  if (canHarvest) {
    const nearWorkSource = opts.preferPos.findClosestByRange(
      FIND_SOURCES_ACTIVE,
      {
        filter: (s) => opts.preferPos.getRangeTo(s.pos) <= harvestWithin,
      },
    );
    if (nearWorkSource) {
      const res = harvestSource(creep, nearWorkSource);
      if (res !== "blocked") return "harvest";
    }

    const anySource = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    if (anySource) {
      const res = harvestSource(creep, anySource);
      if (res !== "blocked") return "harvest";
    }
  }

  return "idle";
}
