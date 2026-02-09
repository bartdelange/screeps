export function runTowers() {
  for (const room of Object.values(Game.rooms)) {
    if (!room.controller?.my) continue;
    const towers = room.find(FIND_MY_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_TOWER,
    }) as StructureTower[];
    if (towers.length === 0) continue;

    const hostiles = room.find(FIND_HOSTILE_CREEPS);
    if (hostiles.length > 0) {
      const healers = hostiles.filter((c) => c.getActiveBodyparts(HEAL) > 0);
      const fighters = hostiles.filter(
        (c) =>
          c.getActiveBodyparts(ATTACK) > 0 ||
          c.getActiveBodyparts(RANGED_ATTACK) > 0,
      );

      for (const tower of towers) {
        const pool =
          healers.length > 0
            ? healers
            : fighters.length > 0
              ? fighters
              : hostiles;

        const target = tower.pos.findClosestByRange(pool) ?? pool[0];
        tower.attack(target);
      }
      continue;
    }

    const wounded = room.find(FIND_MY_CREEPS, {
      filter: (c) => c.hits < c.hitsMax,
    });
    if (wounded.length === 0) continue;

    for (const tower of towers) {
      const target = tower.pos.findClosestByRange(wounded) ?? wounded[0];
      tower.heal(target);
    }
  }
}
