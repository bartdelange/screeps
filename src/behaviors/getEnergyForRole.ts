import {
  getEnergyForAction,
  type GetEnergyResult,
} from "./helpers/getEnergyForAction";
import { runAcquireEnergyWithCache } from "./helpers/runAcquireEnergyWithCache";
import { findEnergyWithdrawTarget } from "./policies/energyAcquirePolicy";
import { getEnergyAcquirePolicyForRole } from "./policies/roleEnergyPolicy";

type GetEnergyForRoleOpts = {
  preferPos?: RoomPosition;
  move?: MoveToOpts;
};

export function getEnergyForRole(
  creep: Creep,
  opts: GetEnergyForRoleOpts = {},
): GetEnergyResult {
  if (creep.memory.role === "mover") {
    const state = runAcquireEnergyWithCache(creep, {
      cache: {
        getId: (mem) => mem._wId as Id<_HasId> | undefined,
        setId: (mem, id) => {
          mem._wId = id;
        },
        clearId: (mem) => {
          delete mem._wId;
        },
      },
      findTarget: (c) =>
        findEnergyWithdrawTarget(c, getEnergyAcquirePolicyForRole(c).withdrawPolicy),
      move: opts.move,
    });
    return state === "acquire" ? "withdraw" : "idle";
  }

  return getEnergyForAction(creep, {
    preferPos: opts.preferPos ?? creep.pos,
  });
}
