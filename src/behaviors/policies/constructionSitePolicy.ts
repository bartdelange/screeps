export function basePriority(site: ConstructionSite): number {
  switch (site.structureType) {
    case STRUCTURE_CONTAINER:
      return 1000;
    case STRUCTURE_SPAWN:
      return 900;
    case STRUCTURE_EXTENSION:
      return 750;
    case STRUCTURE_TOWER:
      return 700;
    case STRUCTURE_STORAGE:
      return 650;
    case STRUCTURE_ROAD:
      return 150;
    case STRUCTURE_RAMPART:
      return 80;
    case STRUCTURE_WALL:
      return 50;
    default:
      return 250;
  }
}
