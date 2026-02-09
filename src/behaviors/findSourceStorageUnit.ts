export function findSourceStorageUnit(
  source: Source,
  creep?: Creep,
): StructureContainer | StructureLink | null {
  const links = source.pos.findInRange(FIND_STRUCTURES, 1, {
    filter: (s) => s.structureType === STRUCTURE_LINK,
  }) as StructureLink[];

  const containers = source.pos.findInRange(FIND_STRUCTURES, 1, {
    filter: (s) => s.structureType === STRUCTURE_CONTAINER,
  }) as StructureContainer[];

  const storageUnits = [...links, ...containers];

  if (storageUnits.length === 0) return null;
  if (!creep) return storageUnits[0];

  const standingOn = storageUnits.find((c) => creep.pos.isEqualTo(c.pos));
  if (standingOn && standingOn.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
    return standingOn;
  }

  const notFull = storageUnits.filter(
    (c) => c.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
  );

  const alt = notFull
    .filter((c) => c.id !== standingOn?.id)
    .sort((a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b))[0];

  return alt ?? standingOn ?? storageUnits[0];
}
