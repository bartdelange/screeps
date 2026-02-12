export function sourceHasContainer(source: Source): boolean {
  return (
    source.pos.findInRange(FIND_STRUCTURES, 1, {
      filter: (st) => st.structureType === STRUCTURE_CONTAINER,
    }).length > 0
  );
}

export function getSourcesWithContainer(room: Room): Source[] {
  return room.find(FIND_SOURCES).filter(sourceHasContainer);
}

export function containersReady(room: Room): boolean {
  return room.find(FIND_SOURCES).every(sourceHasContainer);
}
