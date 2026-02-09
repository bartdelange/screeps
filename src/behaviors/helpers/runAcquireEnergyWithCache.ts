import { moveWithRecovery } from "./moveWithRecovery";
import { runWithCachedTarget } from "./core";
import type { EnergyWithdrawTarget } from "./core";
import { hasEnergy, isDroppedEnergy } from "../policies/energyAcquirePolicy";

export type AcquireEnergyState = "acquire" | "idle";

type AcquireCacheAccess = {
  getId: (mem: CreepMemory) => Id<_HasId> | undefined;
  setId: (mem: CreepMemory, id: Id<_HasId>) => void;
  clearId: (mem: CreepMemory) => void;
};

type RunAcquireEnergyWithCacheOpts = {
  cache: AcquireCacheAccess;
  findTarget: (creep: Creep) => EnergyWithdrawTarget | null;
  move?: MoveToOpts;
};

export function runAcquireEnergyWithCache(
  creep: Creep,
  opts: RunAcquireEnergyWithCacheOpts,
): AcquireEnergyState {
  const result = runWithCachedTarget(creep, {
    cache: opts.cache,
    findTarget: opts.findTarget,
    isValidTarget: hasEnergy,
    runAction: (source) => {
      const res = isDroppedEnergy(source)
        ? creep.pickup(source)
        : creep.withdraw(source, RESOURCE_ENERGY);

      if (res === OK) return "active";
      if (res !== ERR_NOT_IN_RANGE) return "idle";

      const moveRes = moveWithRecovery(
        creep,
        source.pos,
        opts.move ?? { reusePath: 20, maxRooms: 1 },
      );
      return moveRes === "invalid" ? "clear_active" : "active";
    },
  });

  return result === "active" ? "acquire" : "idle";
}
