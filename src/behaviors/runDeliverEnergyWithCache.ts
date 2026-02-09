import { moveWithRecovery } from "./moveWithRecovery";

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

function canReceive(
  target: AnyStoreStructure | null,
  resource: ResourceConstant,
): target is AnyStoreStructure {
  if (!target) return false;
  return (target.store.getFreeCapacity(resource) ?? 0) > 0;
}

export function runDeliverEnergyWithCache(
  creep: Creep,
  opts: RunDeliverEnergyWithCacheOpts,
): DeliverEnergyState {
  const resource = opts.resource ?? RESOURCE_ENERGY;
  const mem = creep.memory;
  let target = getById<AnyStoreStructure>(opts.cache.getId(mem));

  if (!canReceive(target, resource)) {
    opts.cache.clearId(mem);
    target = opts.findTarget(creep);
    if (!canReceive(target, resource)) return "idle";
    opts.cache.setId(mem, target.id as Id<AnyStoreStructure>);
  }

  const res = creep.transfer(target, resource);
  if (res === OK) return "deliver";

  if (res === ERR_NOT_IN_RANGE) {
    const moveRes = moveWithRecovery(
      creep,
      target.pos,
      opts.move ?? { reusePath: 20, maxRooms: 1 },
    );
    if (moveRes === "invalid") opts.cache.clearId(mem);
    return "deliver";
  }

  opts.cache.clearId(mem);
  return "idle";
}
