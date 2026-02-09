type CachedTargetAccess = {
  getId: (mem: CreepMemory) => Id<any> | undefined;
  setId: (mem: CreepMemory, id: Id<any>) => void;
  clearId: (mem: CreepMemory) => void;
};

type CachedActionResult = "active" | "clear_active" | "idle";

type RunWithCachedTargetOpts<T extends _HasId> = {
  cache: CachedTargetAccess;
  findTarget: (creep: Creep) => T | null;
  isValidTarget: (target: T) => boolean;
  runAction: (target: T) => CachedActionResult;
};

function getById<T extends _HasId>(id: Id<T> | undefined): T | null {
  if (!id) return null;
  return Game.getObjectById(id);
}

export function runWithCachedTarget<T extends _HasId>(
  creep: Creep,
  opts: RunWithCachedTargetOpts<T>,
): "active" | "idle" {
  const mem = creep.memory;
  let target = getById(opts.cache.getId(mem) as Id<T> | undefined);

  if (!target || !opts.isValidTarget(target)) {
    opts.cache.clearId(mem);
    target = opts.findTarget(creep);
    if (!target || !opts.isValidTarget(target)) return "idle";
    opts.cache.setId(mem, target.id as Id<any>);
  }

  const result = opts.runAction(target);
  if (result === "active") return "active";
  if (result === "clear_active") {
    opts.cache.clearId(mem);
    return "active";
  }

  opts.cache.clearId(mem);
  return "idle";
}
