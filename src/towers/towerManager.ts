export function runTowers() {
  for (const room of Object.values(Game.rooms)) {
    if (!room.controller?.my) continue;
    const hostiles = room.find(FIND_HOSTILE_CREEPS, {
      filter: (c) => c.owner.username === "Invader",
    });

    if (hostiles.length === 0) continue;

    const towers = room.find(FIND_MY_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_TOWER,
    }) as StructureTower[];

    for (const tower of towers) {
      tower.attack(hostiles[0]);
    }
  }
}
