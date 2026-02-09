import { getLinkRole, type LinkRole } from "../../links/policies/getLinkRole";
import type { EnergyWithdrawTarget } from "../helpers/core";

export type EnergyWithdrawPolicy = {
  includeDropped?: boolean;
  minDroppedAmount?: number;
  includeStructures?: StructureConstant[];
  preferPos?: RoomPosition;
  maxPreferRange?: number;
  preferOnly?: boolean;
  excludeLinkRoles?: LinkRole[];
  preferLinkRoles?: LinkRole[];
};

const DEFAULT_STRUCTURES: StructureConstant[] = [
  STRUCTURE_CONTAINER,
  STRUCTURE_STORAGE,
  STRUCTURE_LINK,
];

function inPreferRange(
  pos: RoomPosition,
  preferPos: RoomPosition | undefined,
  maxPreferRange: number | undefined,
): boolean {
  if (!preferPos || maxPreferRange === undefined) return true;
  return preferPos.getRangeTo(pos) <= maxPreferRange;
}

export function isDroppedEnergy(
  target: EnergyWithdrawTarget,
): target is Resource<RESOURCE_ENERGY> {
  return (
    (target as any).resourceType === RESOURCE_ENERGY &&
    typeof (target as any).amount === "number"
  );
}

export function hasEnergy(target: EnergyWithdrawTarget): boolean {
  return isDroppedEnergy(target)
    ? target.amount > 0
    : target.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
}

export function countWithdrawClaimants(
  room: Room,
  targetId: Id<_HasId>,
  memoryKey: string = "_wId",
): number {
  let n = 0;
  for (const c of Object.values(Game.creeps)) {
    if (c.room.name !== room.name) continue;
    if (c.store.getFreeCapacity(RESOURCE_ENERGY) === 0) continue;
    if ((c.memory as Record<string, unknown>)[memoryKey] === targetId) n++;
  }
  return n;
}

function isAllowedStructure(
  structure: Structure,
  policy: EnergyWithdrawPolicy,
): structure is AnyStoreStructure {
  const allowedTypes = policy.includeStructures ?? DEFAULT_STRUCTURES;
  if (!allowedTypes.includes(structure.structureType)) return false;

  const store = (structure as AnyStoreStructure).store;
  if (!store || store.getUsedCapacity(RESOURCE_ENERGY) <= 0) return false;

  if (
    structure.structureType === STRUCTURE_LINK &&
    (policy.excludeLinkRoles?.length ?? 0) > 0
  ) {
    const role = getLinkRole(structure as StructureLink);
    if (role && policy.excludeLinkRoles!.includes(role)) return false;
  }

  if (
    !inPreferRange(structure.pos, policy.preferPos, policy.maxPreferRange) &&
    policy.preferOnly
  ) {
    return false;
  }

  return true;
}

function scoreStoreTarget(
  creep: Creep,
  target: AnyStoreStructure,
  policy: EnergyWithdrawPolicy,
): number {
  const distance = creep.pos.getRangeTo(target);
  const claimants = countWithdrawClaimants(creep.room, target.id);
  const energy = target.store.getUsedCapacity(RESOURCE_ENERGY);
  let score = distance + claimants * 5 - Math.min(10, energy / 200);

  if (
    target.structureType === STRUCTURE_LINK &&
    (policy.preferLinkRoles?.length ?? 0) > 0
  ) {
    const role = getLinkRole(target as StructureLink);
    if (role && policy.preferLinkRoles!.includes(role)) {
      score -= 100;
    }
  }

  return score;
}

function findDropped(
  creep: Creep,
  policy: EnergyWithdrawPolicy,
): Resource<RESOURCE_ENERGY> | null {
  if (policy.includeDropped === false) return null;
  const minDroppedAmount = policy.minDroppedAmount ?? 20;
  return creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
    filter: (r) =>
      r.resourceType === RESOURCE_ENERGY &&
      r.amount >= minDroppedAmount &&
      inPreferRange(r.pos, policy.preferPos, policy.maxPreferRange),
  }) as Resource<RESOURCE_ENERGY> | null;
}

export function findEnergyWithdrawTargetWithPolicy(
  creep: Creep,
  policy: EnergyWithdrawPolicy = {},
): EnergyWithdrawTarget | null {
  const dropped = findDropped(creep, policy);
  if (dropped) return dropped;

  const stores = creep.room.find(FIND_STRUCTURES, {
    filter: (s) => isAllowedStructure(s, policy),
  }) as AnyStoreStructure[];

  if (stores.length === 0) return null;

  const scored = stores
    .map((s) => ({ target: s, score: scoreStoreTarget(creep, s, policy) }))
    .sort((a, b) => a.score - b.score);

  return scored[0]?.target ?? null;
}

export function findEnergyWithdrawTarget(
  creep: Creep,
  opts: EnergyWithdrawPolicy = {},
): EnergyWithdrawTarget | null {
  return findEnergyWithdrawTargetWithPolicy(creep, {
    excludeLinkRoles: ["source"],
    ...opts,
  });
}
