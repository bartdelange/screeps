import { runWithCachedTarget } from "./helpers/core";
import { canReceiveResource, transferResource } from "./transferEnergy";

export type DeliverEnergyState = "deliver" | "idle";

type DeliverCacheAccess = {
  getId: (mem: CreepMemory) => Id<AnyStoreStructure> | undefined;
  setId: (mem: CreepMemory, id: Id<AnyStoreStructure>) => void;
  clearId: (mem: CreepMemory) => void;
};

type RunDeliverEnergyWithCacheOpts = {
  cache: DeliverCacheAccess;
  findTarget: (creep: Creep) => AnyStoreStructure | null;
  move?: MoveToOpts;
  resource?: ResourceConstant;
};

export function runDeliverEnergyWithCache(
  creep: Creep,
  opts: RunDeliverEnergyWithCacheOpts,
): DeliverEnergyState {
  const resource = opts.resource ?? RESOURCE_ENERGY;
  const result = runWithCachedTarget(creep, {
    cache: opts.cache,
    findTarget: opts.findTarget,
    isValidTarget: (target) => canReceiveResource(target, resource),
    runAction: (target) => {
      const res = transferResource(creep, target, {
        resource,
        move: opts.move,
      });
      return res === "done" || res === "not_in_range" ? "active" : "idle";
    },
  });

  return result === "active" ? "deliver" : "idle";
}
