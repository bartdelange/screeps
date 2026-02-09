export type LinkRole = "source" | "hub" | "controller" | "storage";

export function getLinkRole(link: StructureLink): LinkRole | null {
  const { room } = link;

  if (
    link.pos.findInRange(FIND_SOURCES, 2).length > 0
  ) return "source";

  if (
    room.controller &&
    link.pos.inRangeTo(room.controller, 3)
  ) return "controller";

  if (
    room.storage &&
    link.pos.inRangeTo(room.storage, 2)
  ) return "storage";

  return "hub";
}
