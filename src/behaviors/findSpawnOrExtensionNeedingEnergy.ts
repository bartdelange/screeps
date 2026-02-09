export function findSpawnOrExtensionNeedingEnergy(
  creep: Creep,
): AnyStoreStructure | null {
  return creep.pos.findClosestByPath(FIND_STRUCTURES, {
    filter: (s) =>
      (s.structureType === STRUCTURE_SPAWN ||
        s.structureType === STRUCTURE_EXTENSION) &&
      (s as AnyStoreStructure).store.getFreeCapacity(RESOURCE_ENERGY) > 0,
  }) as AnyStoreStructure | null;
}
