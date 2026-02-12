import { getLinkRole, LinkRole } from "../policies/getLinkRole";

export function getRoomLinks(room: Room) {
  const links = room.find(FIND_MY_STRUCTURES, {
    filter: (s) => s.structureType === STRUCTURE_LINK,
  }) as StructureLink[];

  const byRole: Record<LinkRole, StructureLink[]> = {
    source: [],
    hub: [],
    controller: [],
    storage: [],
  };

  for (const link of links) {
    const role = getLinkRole(link);
    if (role) byRole[role].push(link);
  }

  return byRole;
}
