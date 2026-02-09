import { findEnergyWithdrawTarget } from "./findEnergyWithdrawTarget";
import { harvestSource } from "./harvestSource";
import { withdrawEnergy } from "./helpers/withdrawEnergy";

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

  if (creep.getActiveBodyparts(WORK) > 0) {
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
  }

  const nearWorkStore = findEnergyWithdrawTarget(creep, {
    includeDropped: false,
    preferPos: opts.preferPos,
    maxPreferRange: withdrawWithin,
    preferOnly: true,
  });
  if (nearWorkStore) {
    withdrawEnergy(creep, nearWorkStore);
    return "withdraw";
  }

  const anyStore = findEnergyWithdrawTarget(creep);
  if (anyStore) {
    withdrawEnergy(creep, anyStore);
    return "withdraw";
  }

  if (creep.getActiveBodyparts(WORK) > 0) {
    const anySource = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    if (anySource) {
      const res = harvestSource(creep, anySource);
      if (res !== "blocked") return "harvest";
    }
  }

  return "idle";
}
