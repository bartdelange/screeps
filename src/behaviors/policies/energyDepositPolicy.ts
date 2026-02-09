import { getLinkRole, type LinkRole } from "../../links/policies/getLinkRole";
import { getEnergyDepositPolicyForRole } from "./roleEnergyPolicy";

export type EnergyDepositPolicy = {
  resource?: ResourceConstant;
  priorityTiers?: StructureConstant[][];
  includeLinkRoles?: LinkRole[];
};

const DEFAULT_TIERS: StructureConstant[][] = [
  [STRUCTURE_SPAWN, STRUCTURE_EXTENSION],
  [STRUCTURE_STORAGE],
];

function findNearestWithFreeCapacity(
  creep: Creep,
  resource: ResourceConstant,
  types: StructureConstant[],
  policy: EnergyDepositPolicy,
): AnyStoreStructure | null {
  return creep.pos.findClosestByPath(FIND_STRUCTURES, {
    filter: (s) => {
      if (!types.includes(s.structureType)) return false;

      if (
        s.structureType === STRUCTURE_LINK &&
        (policy.includeLinkRoles?.length ?? 0) > 0
      ) {
        const role = getLinkRole(s as StructureLink);
        if (!role || !policy.includeLinkRoles!.includes(role)) return false;
      }

      const store = (s as AnyStoreStructure).store;
      if (!store) return false;
      return (store.getFreeCapacity(resource) ?? 0) > 0;
    },
  }) as AnyStoreStructure | null;
}

type FindEnergyDepositTargetOpts = {
  includeTypes?: StructureConstant[];
  excludeTypes?: StructureConstant[];
};

export function findEnergyDepositTarget(
  creep: Creep,
  opts: FindEnergyDepositTargetOpts = {},
): AnyStoreStructure | null {
  const policy = getEnergyDepositPolicyForRole(creep);
  const includeTypes = opts.includeTypes ?? null;
  const excludeTypes = opts.excludeTypes ?? [];
  const resource = policy.resource ?? RESOURCE_ENERGY;
  const tiers = (policy.priorityTiers ?? DEFAULT_TIERS)
    .map((tier) =>
      tier.filter(
        (t) =>
          !excludeTypes.includes(t) &&
          (includeTypes === null || includeTypes.includes(t)),
      ),
    )
    .filter((tier) => tier.length > 0);

  for (const tier of tiers) {
    const target = findNearestWithFreeCapacity(creep, resource, tier, policy);
    if (target) return target;
  }

  return null;
}
