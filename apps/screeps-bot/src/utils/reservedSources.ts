import { getRoomCreeps } from "./roomCreeps";

export function getReservedSourceIds(room: Room): Set<Id<Source>> {
  const set = new Set<Id<Source>>();

  for (const c of getRoomCreeps(room, { role: "miner" })) {
    const sid = c.memory.sourceId as Id<Source> | undefined;
    if (sid) set.add(sid);
  }

  return set;
}
