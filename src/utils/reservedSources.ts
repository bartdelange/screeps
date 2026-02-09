export function getReservedSourceIds(room: Room): Set<Id<Source>> {
  const set = new Set<Id<Source>>();

  for (const c of Object.values(Game.creeps)) {
    if (c.room.name !== room.name) continue;
    if (c.memory.role !== "miner") continue;

    const sid = c.memory.sourceId as Id<Source> | undefined;
    if (sid) set.add(sid);
  }

  return set;
}
