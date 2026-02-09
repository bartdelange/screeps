export type EnergyDepositPolicy = {
  resource?: ResourceConstant;
  priorityTiers?: StructureConstant[][];
};

const DEFAULT_TIERS: StructureConstant[][] = [
  [STRUCTURE_SPAWN, STRUCTURE_EXTENSION],
  [STRUCTURE_STORAGE],
];

function findNearestWithFreeCapacity(
  creep: Creep,
  resource: ResourceConstant,
  types: StructureConstant[],
): AnyStoreStructure | null {
  return creep.pos.findClosestByPath(FIND_STRUCTURES, {
    filter: (s) => {
      if (!types.includes(s.structureType)) return false;
      const store = (s as AnyStoreStructure).store;
      if (!store) return false;
      return (store.getFreeCapacity(resource) ?? 0) > 0;
    },
  }) as AnyStoreStructure | null;
}

export function findEnergyDepositTargetWithPolicy(
  creep: Creep,
  policy: EnergyDepositPolicy = {},
): AnyStoreStructure | null {
  const resource = policy.resource ?? RESOURCE_ENERGY;
  const tiers = policy.priorityTiers ?? DEFAULT_TIERS;

  for (const tier of tiers) {
    const target = findNearestWithFreeCapacity(creep, resource, tier);
    if (target) return target;
  }

  return null;
}
