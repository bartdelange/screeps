export function containersReady(room: Room): boolean {
  const sources = room.find(FIND_SOURCES);
  return sources.every(
    (s) =>
      s.pos.findInRange(FIND_STRUCTURES, 1, {
        filter: (st) => st.structureType === STRUCTURE_CONTAINER,
      }).length > 0,
  );
}
