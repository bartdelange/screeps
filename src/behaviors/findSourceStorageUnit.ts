import { getLinkRole } from "../links/policies/getLinkRole";

export function findSourceStorageUnit(
  source: Source,
  creep?: Creep,
): StructureContainer | StructureLink | null {
  const sourceLinks = source.pos.findInRange(FIND_STRUCTURES, 1, {
    filter: (s) =>
      s.structureType === STRUCTURE_LINK &&
      getLinkRole(s as StructureLink) === "source",
  }) as StructureLink[];

  const containers = source.pos.findInRange(FIND_STRUCTURES, 1, {
    filter: (s) => s.structureType === STRUCTURE_CONTAINER,
  }) as StructureContainer[];

  const storageUnits = [...sourceLinks, ...containers];
  const notFullSourceLinks = sourceLinks.filter(
    (c) => c.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
  );
  const notFullContainers = containers.filter(
    (c) => c.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
  );
  const notFullUnits = [...notFullSourceLinks, ...notFullContainers];

  if (storageUnits.length === 0) return null;
  if (!creep) return notFullUnits[0] ?? storageUnits[0];

  const standingOn = storageUnits.find((c) => creep.pos.isEqualTo(c.pos));
  const activeSourceLink = notFullSourceLinks.sort(
    (a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b),
  )[0];
  if (activeSourceLink && !creep.pos.isEqualTo(activeSourceLink.pos)) {
    return activeSourceLink;
  }

  if (standingOn && standingOn.store.getFreeCapacity(RESOURCE_ENERGY) > 0) return standingOn;

  const fallback = notFullUnits
    .filter((c) => c.id !== standingOn?.id)
    .sort((a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b))[0];

  return fallback ?? standingOn ?? storageUnits[0];
}
