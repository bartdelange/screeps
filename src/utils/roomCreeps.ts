type RoomCreepFilterOpts = {
  role?: string;
  includeRetiring?: boolean;
  includeSpawning?: boolean;
  predicate?: (creep: Creep) => boolean;
};

export function getRoomCreeps(
  room: Room,
  opts: RoomCreepFilterOpts = {},
): Creep[] {
  const includeRetiring = opts.includeRetiring ?? true;
  const includeSpawning = opts.includeSpawning ?? true;

  return Object.values(Game.creeps).filter((creep) => {
    if (creep.room.name !== room.name) return false;
    if (!includeSpawning && creep.spawning) return false;
    if (!includeRetiring && creep.memory.retire) return false;
    if (opts.role && creep.memory.role !== opts.role) return false;
    if (opts.predicate && !opts.predicate(creep)) return false;
    return true;
  });
}
