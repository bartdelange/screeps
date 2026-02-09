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

function getById<T extends _HasId>(id: Id<T> | undefined): T | null {
  if (!id) return null;
  return Game.getObjectById(id);
}

export function runDeliverEnergyWithCache(
  creep: Creep,
  opts: RunDeliverEnergyWithCacheOpts,
): DeliverEnergyState {
  const resource = opts.resource ?? RESOURCE_ENERGY;
  const mem = creep.memory;
  let target = getById<AnyStoreStructure>(opts.cache.getId(mem));

  if (!canReceiveResource(target, resource)) {
    opts.cache.clearId(mem);
    target = opts.findTarget(creep);
    if (!canReceiveResource(target, resource)) return "idle";
    opts.cache.setId(mem, target.id as Id<AnyStoreStructure>);
  }

  const res = transferResource(creep, target, {
    resource,
    move: opts.move,
  });
  if (res === "done" || res === "not_in_range") {
    return "deliver";
  }

  opts.cache.clearId(mem);
  return "idle";
}
