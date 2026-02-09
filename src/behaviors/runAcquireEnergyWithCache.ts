import { moveWithRecovery } from "./helpers/moveWithRecovery";
import type { EnergyWithdrawTarget } from "./helpers/types";
import { hasEnergy, isDroppedEnergy } from "./policies/energyAcquirePolicy";

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

function getById<T extends _HasId>(id: Id<T> | undefined): T | null {
  if (!id) return null;
  return Game.getObjectById(id);
}

export function runAcquireEnergyWithCache(
  creep: Creep,
  opts: RunAcquireEnergyWithCacheOpts,
): AcquireEnergyState {
  const mem = creep.memory;
  let source = getById(opts.cache.getId(mem)) as EnergyWithdrawTarget | null;

  if (!source || !hasEnergy(source)) {
    opts.cache.clearId(mem);
    source = opts.findTarget(creep);
    if (!source) return "idle";
    opts.cache.setId(mem, source.id as Id<_HasId>);
  }

  const res = isDroppedEnergy(source)
    ? creep.pickup(source)
    : creep.withdraw(source, RESOURCE_ENERGY);

  if (res === OK) return "acquire";

  if (res === ERR_NOT_IN_RANGE) {
    const moveRes = moveWithRecovery(
      creep,
      source.pos,
      opts.move ?? { reusePath: 20, maxRooms: 1 },
    );
    if (moveRes === "invalid") opts.cache.clearId(mem);
    return "acquire";
  }

  opts.cache.clearId(mem);
  return "idle";
}
