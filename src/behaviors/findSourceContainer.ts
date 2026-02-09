export function findSourceContainer(
  source: Source,
  creep?: Creep,
): StructureContainer | null {
  const containers = source.pos.findInRange(FIND_STRUCTURES, 1, {
    filter: (s) => s.structureType === STRUCTURE_CONTAINER,
  }) as StructureContainer[];

  if (containers.length === 0) return null;
  if (!creep) return containers[0];

  const standingOn = containers.find((c) => creep.pos.isEqualTo(c.pos));
  if (standingOn && standingOn.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
    return standingOn;
  }

  const notFull = containers.filter(
    (c) => c.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
  );

  const alt = notFull
    .filter((c) => c.id !== standingOn?.id)
    .sort((a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b))[0];

  return alt ?? standingOn ?? containers[0];
}
