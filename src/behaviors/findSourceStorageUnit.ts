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
  if (!creep) return notFullContainers[0] ?? notFullSourceLinks[0] ?? storageUnits[0];

  const standingOnContainer = containers.find((c) => creep.pos.isEqualTo(c.pos));
  if (
    standingOnContainer &&
    standingOnContainer.store.getFreeCapacity(RESOURCE_ENERGY) > 0
  ) {
    return standingOnContainer;
  }

  const bestContainer =
    notFullContainers.sort((a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b))[0] ??
    containers.sort((a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b))[0];
  if (bestContainer) return bestContainer;

  const bestLink =
    notFullSourceLinks.sort((a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b))[0] ??
    sourceLinks.sort((a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b))[0];

  return bestLink ?? notFullUnits[0] ?? storageUnits[0];
}

function isWalkableTile(room: Room, pos: RoomPosition): boolean {
  if (pos.x <= 0 || pos.x >= 49 || pos.y <= 0 || pos.y >= 49) return false;
  if (room.getTerrain().get(pos.x, pos.y) === TERRAIN_MASK_WALL) return false;

  const structures = pos.lookFor(LOOK_STRUCTURES);
  for (const s of structures) {
    if (s.structureType === STRUCTURE_ROAD) continue;
    if (s.structureType === STRUCTURE_CONTAINER) continue;
    if (s.structureType === STRUCTURE_RAMPART) {
      const rampart = s as StructureRampart;
      if (rampart.my || rampart.isPublic) continue;
    }
    return false;
  }

  return true;
}

export function findSourceMiningPos(
  source: Source,
  storageUnit: StructureContainer | StructureLink,
  creep?: Creep,
): RoomPosition | null {
  if (storageUnit.structureType === STRUCTURE_CONTAINER) return storageUnit.pos;

  const candidates: RoomPosition[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;

      const x = source.pos.x + dx;
      const y = source.pos.y + dy;
      if (x < 0 || x > 49 || y < 0 || y > 49) continue;

      const pos = new RoomPosition(x, y, source.room.name);
      if (!pos.inRangeTo(storageUnit.pos, 1)) continue;
      if (!isWalkableTile(source.room, pos)) continue;
      candidates.push(pos);
    }
  }

  if (candidates.length === 0) return null;
  if (creep && candidates.some((pos) => creep.pos.isEqualTo(pos))) return creep.pos;

  return candidates.sort((a, b) => {
    const byRange = (creep ? creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b) : 0);
    if (byRange !== 0) return byRange;
    return a.getRangeTo(storageUnit.pos) - b.getRangeTo(storageUnit.pos);
  })[0];
}
